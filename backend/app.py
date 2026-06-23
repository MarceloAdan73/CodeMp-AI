from flask import Flask, request, jsonify
import time
import os
import shutil
import subprocess
import json
import tempfile
from dotenv import load_dotenv
from llm_bridge import create_llm
from llm_bridge.providers.callable_provider import CallableClient

load_dotenv()

app = Flask(__name__)

RUFF_CMD = shutil.which('ruff')
if not RUFF_CMD:
    RUFF_CMD = shutil.which('ruff', path=os.path.join(os.path.dirname(__file__), 'venv', 'Scripts'))


def build_claude_client(model: str) -> CallableClient:
    def call_claude(messages, temperature=0.7, max_tokens=1024, **kwargs):
        try:
            from anthropic import Anthropic
        except ImportError:
            raise ImportError('anthropic package required for Claude provider')

        client = Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))
        system = None
        claude_messages = []
        for m in messages:
            if m['role'] == 'system':
                system = m['content']
            else:
                claude_messages.append({'role': m['role'], 'content': m['content']})

        resp = client.messages.create(
            model=model,
            system=system,
            messages=claude_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.content[0].text if resp.content else ''

    return CallableClient(fn=call_claude, model=model)


def build_grok_client(model: str) -> CallableClient:
    def call_grok(messages, temperature=0.7, max_tokens=1024, **kwargs):
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError('openai package required for Grok provider')

        client = OpenAI(
            api_key=os.environ.get('XAI_API_KEY'),
            base_url='https://api.xai.com/v1',
        )
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ''

    return CallableClient(fn=call_grok, model=model)


@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data or 'messages' not in data:
            return jsonify({'error': 'messages is required'}), 400

        provider = data.get('provider', 'mock')
        model = data.get('model', 'qwen2.5-coder:1.5b')
        temperature = data.get('temperature', 0.7)
        base_url = data.get('base_url')

        if provider == 'mock':
            llm = create_llm({'provider': 'mock', 'model': model})
        elif provider == 'openai':
            config = {'provider': 'openai', 'model': model}
            if base_url:
                config['base_url'] = base_url
                config['api_key'] = 'ollama'
            llm = create_llm(config)
        elif provider in ('google', 'gemini'):
            llm = create_llm({'provider': 'google', 'model': model})
        elif provider == 'claude':
            llm = build_claude_client(model)
        elif provider == 'grok':
            llm = build_grok_client(model)
        else:
            return jsonify({'error': f'Unknown provider: {provider}'}), 400

        start = time.time()
        resp = llm.chat(data['messages'], temperature=temperature)
        elapsed = int((time.time() - start) * 1000)

        return jsonify({
            'content': resp.content,
            'total_tokens': resp.total_tokens,
            'latency_ms': elapsed,
            'model': resp.model or model,
        })

    except Exception as e:
        print(f'Error in /chat: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/lint', methods=['POST'])
def lint():
    try:
        data = request.get_json()
        if not data or 'code' not in data:
            return jsonify({'error': 'code is required'}), 400

        code = data['code']

        with tempfile.NamedTemporaryFile(suffix='.py', mode='w', delete=False) as f:
            f.write(code)
            temp_path = f.name

        try:
            result = subprocess.run(
                [RUFF_CMD, 'check', '--output-format', 'json', temp_path],
                capture_output=True, text=True, timeout=15,
            )

            ruff_errors = json.loads(result.stdout.strip() or '[]')

            errors = []
            for e in ruff_errors:
                errors.append({
                    'message': e.get('message', 'Unknown error'),
                    'ruleId': e.get('code'),
                    'line': e.get('location', {}).get('row'),
                    'column': e.get('location', {}).get('column'),
                    'severity': 2 if e.get('severity') == 'error' else 1,
                })

            subprocess.run(
                [RUFF_CMD, 'check', '--fix-only', '--output-format', 'json', temp_path],
                capture_output=True, text=True, timeout=15,
            )

            with open(temp_path, 'r') as f:
                fixed_code = f.read()

            return jsonify({
                'errors': errors,
                'fixedCode': fixed_code,
            })

        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Lint timeout'}), 504
    except FileNotFoundError:
        return jsonify({'error': 'Ruff not installed'}), 500
    except Exception as e:
        print(f'Error in /lint: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'provider': 'llm_bridge'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
