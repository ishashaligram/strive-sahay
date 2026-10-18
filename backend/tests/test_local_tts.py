from services.local_tts import spoken_numbers

def test_score_numbers_remain_audible_in_regional_speech():
    hindi=spoken_numbers('8.2 / 10','hi')
    assert 'आठ दशमलव दो' in hindi
    assert 'एक शून्य' in hindi
    assert spoken_numbers('८.२','hi').startswith('आठ दशमलव दो')
