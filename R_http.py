from myHttp import http
import json
from mySecrets import toHex
from copy import deepcopy


R_BASE_URL = 'http://127.0.0.1:'


def R_call(id: int, data: dict) -> None:
    '''
    All be in the final format passed into R, should be pre-processed before
    '''
    json_data = deepcopy(data)
    json_data['f'] = id
    base_url = R_BASE_URL + str(9000 + id)
    json_data = json.dumps(json_data, ensure_ascii=False)
    json_data = toHex(json_data)
    url = base_url + '/' + json_data
    response = http(url, Timeout=3600000, Decode=False, Retry=False)
    if (response['status'] < 0):
        return (False, b'')
    if (response['code'] == 200):
        return (True, b'')
    if (response['code'] == 500):
        return (False, response['text'])
    return (False, b'')


