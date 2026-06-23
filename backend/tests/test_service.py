import pytest
from app import app


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as c:
        yield c


def test_health(client):
    resp = client.get('/health')
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'ok'


def test_chat_mock(client):
    resp = client.post('/chat', json={
        'provider': 'mock',
        'messages': [{'role': 'user', 'content': 'Hello'}],
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'content' in data
    assert 'total_tokens' in data
    assert 'latency_ms' in data


def test_chat_no_messages(client):
    resp = client.post('/chat', json={})
    assert resp.status_code == 400


def test_chat_unknown_provider(client):
    resp = client.post('/chat', json={
        'provider': 'nonexistent',
        'messages': [{'role': 'user', 'content': 'Hello'}],
    })
    assert resp.status_code == 400


def test_lint_python(client):
    resp = client.post('/lint', json={
        'code': 'import os\nx = 1\nprint(x)\n',
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'errors' in data
    assert 'fixedCode' in data
    assert len(data['errors']) > 0
    assert 'os' not in data['fixedCode']


def test_lint_clean_code(client):
    resp = client.post('/lint', json={
        'code': 'x = 1\nprint(x)\n',
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data['errors']) == 0


def test_lint_no_code(client):
    resp = client.post('/lint', json={})
    assert resp.status_code == 400
