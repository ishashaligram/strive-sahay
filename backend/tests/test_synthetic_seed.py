import json,sqlite3
from pathlib import Path

def test_seed_is_isolated_idempotent_and_scores_are_honestly_labelled(tmp_path,monkeypatch):
    monkeypatch.setenv('DEMO_DATABASE_PATH',str(tmp_path/'demo.sqlite3'))
    real=tmp_path/'real.sqlite3'
    monkeypatch.setenv('DATABASE_PATH',str(real))
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parents[2]/'scripts'))
    from seed_synthetic_demo import seed
    seed();seed()
    with sqlite3.connect(tmp_path/'demo.sqlite3') as db:
        cases=[json.loads(row[0]) for row in db.execute('SELECT body FROM submissions')]
    assert len(cases)==5
    assert all(case['synthetic'] and case['currentScore']['assessmentType']=='SYNTHETIC_DEMO_SCORE' for case in cases)
    assert all(case['sources'][0]['original'].startswith('SYNTHETIC DEMO') for case in cases)
    assert not real.exists()
