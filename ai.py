from R_http import *
from utils import *
from mySecrets import hexToStr
from openai import OpenAI
from time import time
import json
from random import randint
from typing import Union, Literal, Tuple
from myBasics import binToBase64
from hashlib import sha256
from queue import Queue
from _thread import start_new_thread
from copy import deepcopy
import anthropic
import traceback
import secrets
import openai

__all__ = ['process_ai_chat']


PROMPT = """## 1. Introduction and Task

You are the AI assistant of GutOmicsAtlas website. This website is for the display of some biology data, about human's gut. Its main functions include the showing gene expression images and spatial images. You need to chat with users, answer their questions, and generate images (by calling python functions) based on their requirements.

GutOmicsAtlas is an Al-powered, user-friendly, open-access platform designed to analyzing single cell RNA-seq (scRNA-seq), Single-nucleus ATAC-seq (snATAC-seq), Spatial metabolomics, and Spatial Transcriptomics data. By integrating these datasets, GutOmicsAtlas provides a comprehensive framework for systematically analyzing cellular responses and molecular changes in human gut cells throughout development.

You can also ask questions to GLKB AI assistant. The Genomic Literature Knowledge Base (GLKB) is a comprehensive and powerful resource that integrates over 263 million biomedical terms and more than 14.6 million biomedical relationships. This collection is curated from 33 million PubMed abstracts and nine well-established biomedical repositories, offering an unparalleled wealth of knowledge for researchers and practitioners in the field. The AI assistant of GLKB can search the database and answer user's question based on the database. If user asks some questions in the biology field but not related to this website, you can use GLKB to answer user's question.

## 2. Functions

The website has the following 5 functions, as following:

1. def scRNA(gene: str, type: Literal["epithelial", "enteroendocrine"]) -> bytes:
    '''
    Show the gene expression (umap and expression level) in single cell RNA-seq. 
    gene should be gene ID (or genetic loci), case insensitive. type can only be "epithelial" or "enteroendocrine", they are for Epithelial cells and Enteroendocrine cells.
    '''

2. def snATAC(gene: str, type: Literal["all", "epithelial"]) -> bytes:
    '''
    Show the gene expression (IGV plot) in Single-nucleus ATAC-seq. 
    gene should be gene ID (or genetic loci), case insensitive. type can only be "all" or "epithelial", they are for All cell types and Epithelial cells.
    '''

3. def spatial_transcriptomics(gene: str) -> bytes:
    '''
    Show the gene's spatial comparison in Duodenum and  Colon.
    gene should be gene ID, case insensitive.
    '''

4. def spatial_metabolomics(name: str) -> bytes:
    '''
    Show chemicals' effect and signal on Duodenum and  Colon.
    Can only select from following values, case insensitive.
    ['Bisphosphoglyceric Acid', 'Lactic Acid', 'PS 38:4 (pos)', 'PE O-40:0', 'PC 34:2', 'Cys-Gly', 'PS 44:4', 'PS O-40:4', 'PC O-34:5', 'Pyruvic acid', 'PS O-40:7', 'PA 42:0', '(3−sulfo)Galbeta-Cer(d18:1/18:0(2OH))', 'IMP', 'PG 42:7', 'PA 44:3', 'PG 38:4', 'PS 44:5', 'Cer(d34:1) (pos)', 'PI O-30:1', 'PC 34:0', 'PI O-36:2', 'PI O-30:2', 'PI O-28:1', 'PE 34:0 (pos2)', 'Cholesterol Sulfate', 'PC 36:1', 'Dopa', 'Hemin', 'Arginine', 'PT 36:1', 'Glucose (pos)', 'ADP', 'dIMP', 'Heme', 'PE 38:1 (pos)', 'Alanine', 'PE O-38:6', 'PG 44:12', 'PE O-38:8', 'PE 40:7', 'PC 38:6', 'PC 40:6', 'LPA 18:2', 'UDP N-acetylglucosamine', 'PC 38:4', '(3−sulfo)GalbetaCer(d18:1/16:0(2OH))', 'PC 40:8', 'PC 36:2', 'PE 26:1', 'Pantothenic Acid (Vitamin B5)', 'LPI 16:0', 'PC 38:3', 'PC 38:7', 'PC 42:9', 'PA 42:8', 'GMP', 'UMP', 'LPI 18:1', 'PE O-36:4', 'AMP', 'PC 36:5', 'PA 36:3', 'LPE O-16:0', 'PI 32:1', 'PI 38:4', 'PI O-36:4', 'PI 36:4', 'PI 36:3', 'PA 36:4', 'gamma Glutamylglutamic Acid', "5'-CMP", 'PG 38:3', 'Eicosapentaenoic Acid (20:5 N-3)', 'PI 34:1', 'Lactobionic Acid', 'PA 34:2 (pos2)', 'PE 36:3 (pos)', 'PC O-36:5', 'PI 36:1', 'dTDP', 'PS 36:1', 'PE 38:4 (pos)', 'Acetylcarnitine (pos)', 'PC 22:1', 'dADP', 'PA 40:6 (pos)', 'PI 36:2', 'PE 38:4 (neg)', 'LPC O-18:2', 'PC O-40:8', 'PE 36:1', 'PE O-40:6', 'PE 36:4', 'LPE 20:5', 'PG 34:1', 'UDP', 'PA 42:10 (pos)', 'PC 34:1', 'PC 20:1', 'PI 36:5', 'PS 34:1', 'LPE O-18:0', 'PC 36:6', 'PC 30:0', 'PC O-34:1', 'PA 42:1 (neg)', 'Linoleic Acid', 'PE 36:2', 'PA 38:5', 'LPS O-16:1', 'PE 38:5', 'Fructose Bisphosphate', 'Carnitine', 'DG O-36:4', 'PE 32.1', 'Acetyl phosphate', 'PA 34:2 (neg)', 'PC 32:4', 'PE O-38:4', 'Adenine', 'LPE 20:4', 'PS 40:4', 'PS 40:6', 'LPA O-20:4', 'PC 42:10', 'PE 34:1', 'PA 38:1', 'PI O-38:4', 'PS 40:1', 'SM(d35:1) (pos)', 'PS 38:3', 'PC 42:8', 'GSH', 'PS 42:1', 'PE 38:6', 'PS 38:4 (neg)', 'PA 40:1', 'LPE 18:3', 'CPA 18:0', 'PE 36:3 (neg)', 'CPA 18:1 (neg)', 'LPE 18:2', 'PI 38:6', 'PC 32:1', 'Guanine', 'PA 42:2 (pos)', 'PE 34:2', 'PC 32:5', 'SM(d42:2)', 'PE O-40:4', 'PG 36:2', 'SM(d34:1)', 'PA 38:6', 'PA 42:3', 'CPA 16:0', 'Arachidonic Acid', 'LPE 22:6', 'Docosahexaenoic Acid', 'Eicosatrienoic Acid (20:3 N-3)', 'LPA 18:0', 'Threonine', 'Asparagine', 'PA 38:4', 'LPE 18:1', 'LPE 20:0', 'PE 34:0 (pos1)', 'LPI 18:0', 'PA 40:4', 'LPE 18:0', 'Dityrosine', 'PA 36:2', 'PC O-38:7', 'Ribose 5-Phosphate', 'LPA 18:1', 'PA 38:2', 'LPE 22:4', 'Glucose (neg)', 'LPA 22:6', 'PC O-32:0', 'PE 38:1 (neg)', 'Glutarylglycine N-Acetylglutamic Acid', 'PA 38:3', 'PA 34:1', 'LPE 16:0', 'PS 36:2', 'PE 38:2', 'LPA 20:4 (neg)', 'Docosapentaenoic Acid', '4 Aminobutyric acid (GABA)', 'Phosphohexose/Phosphoinositol', 'PA 40:5', 'Tyr-Tyr', 'Cer(d34:1) (neg)', 'PE 40:4', 'Ascorbic Acid', 'LPA 16:0', 'N-Acetylneuraminic Acid (Neu5Ac)', 'LPC 16:0', 'Citric Acid', 'LPE 22:5', 'SM(d40:1)', 'PA 40:6 (neg)', 'Aconitic Acid', 'Oxoadipic Acid', 'Sedoheptulose', 'SM(d36:2)', 'Stearic Acid', 'Adrenic Acid', 'Oleic Acid', 'SM(d33:1)', 'LPE 16:1', 'PE 40:5', 'Zinc Chloride', 'PA 40:2', 'N-gamma Glutamylglutamine', 'PC 32:0', 'DG O-32:2', 'O-Phosphoethanolamine', 'Taurine', 'LPA 20:4 (pos)', 'N-Acetylaspartylglutamate (NAAG)', '4-Phosphopantothenate', '5-Oxoproline Pyroglutamate', 'PA 34:2 (pos1)', 'Copper (I) Chloride', 'Aspartic Acid', 'PC O-38:4', 'PE 34:0 (neg)', 'Fumaric Acid', 'PE 32:0', 'CPA 18.1 (pos)', 'N-Acetylaspartic Acid', 'LPA 22:4', 'PS 26:0', 'Gluconolactone(GDL)', 'Farnesylpyrophosphate', 'Glutamic Acid', 'Asn-Met', 'PC 32:3', 'Glycerylphosphorylethanolamine', 'PA O-38:5', 'Lactose', 'Glutamylhydroxyproline', 'LPE 20:1', 'Methyluridine Ribothymidine ', 'PA 32:0', '3-Phosphoglyceroinositol', 'LPE 20:2', 'PA 34:0', 'Palmitic Acid', 'Histidine', 'Glutamine', 'SM(d36:1)', 'Pyrophosphoric Acid', 'Malic Acid', '6-Phosphogluconic Acid', 'PA 42:2 (neg)', 'Sedoheptulose 7-Phosphate', 'SM(d35:1) (neg)', 'Uric Acid', 'PE 38:0', 'Hydroxybutyrylcarnitine', 'Uridine', 'Carnosine', 'Palmitoylglycine', 'Magnesium Dichloride', 'Sulfuric Acid', 'SM(d32:1)', 'Calcitroate', 'Xanthine', 'Acetolactate/Glutaric acid', 'Phosphoric Acid', 'Iron (II) Chloride', 'Inosine', 'Hydroxypropionylcarnitine', 'Iron (III) Chloride', 'Glycerophosphocholine', 'Succinic Acid', 'Threonic Acid', 'Hexose Phosphate', 'Propionylcarnitine', 'Potassium Chloride', '19-Nonanedioate', 'Sodium Chloride', '6-Phosphonogluconolactone d-6PGL Dehydrodeoxyphosphogluconate', 'Acetylcarnitine (neg)', 'Phosphoglycerate', 'Calcium Chloride', 'PC O-34:3', 'Guanosine', 'LPI O-20:1', 'Erythrose Phosphate', 'PS O-36:4', 'Glucosamine 6-phosphate']
    '''

5. static_images(name: Literal["scRNA_Epithelial", "scRNA_Enteroendocrine", "snATAC_all", "snATAC_Epithelial", "st_umap_dot", "st_duodenum_colon"]) -> bytes:
    '''
    To show some static images to the user. Currently has following:
    1. scRNA_Epithelial: two images on the scRNA page (when Epithelial cells is selected), left is an UMAP plot showing gut epithelial cell clusters by type with distinct colors, right is a dot plot displaying gene expression levels across five gut epithelial cell types.
    2. scRNA_Enteroendocrine: two images on the scRNA page (when Enteroendocrine cells is selected), similar as above.
    3. snATAC_all: two images on the scATAC page (when All cell types is selected), left is an UMAP plot showing clustered cell types, color-coded by identity (endothelial, epithelial, immune, etc.), right is a dot plot displaying gene expression levels and percentages across different cell types.
    4. snATAC_Epithelial: two images on the scATAC page (when Epithelial cells is selected), similar as above.
    5. st_umap_dot: two images on the spatial transcriptomics page, containing a UMAP and a dotplot (similar as above).
    6. st_duodenum_colon: two images  on the spatial transcriptomics page, they are spatial transcriptomics plots of duodenum (left) and colon (right) showing color-coded cell types: enterocytes, stem cells, goblet cells, EECs, and TA cells.

    Note: the above I say 2 images, actually they are put together in one png file.
    name is case sensitive.
    '''

6. glkb_ai_assistant(question: str) -> str:
    '''
    Ask questions to GLKB AI assistant. The GLKB assistant can only see the question string, it cannot see any chat history between user and you, so you need to provide all the backgroung and necessary information to it. The result will be displayed to user directly, will not be provided to you.
    '''

## 3. Output Format

### 3.1 General Format

You need to choose which function(s) to call, and the parameters of it, based on the user's input. And also answer user's questions.

The final result should be in json, a list of messages.

A message is one of the following kind:

1. text: the text content shown directly to user. In json, just use the string in json.
2. function: call our python function to generate something, and show it to user. In json, use a dict with 2 keys (name and parameters)

### 3.2 the format of function calling

Each function calling is a dict, with 2 keys: name and parameters.

1. name: the name of the python function to call. Note that name is case sensitive.
2. parameters: a list of paramenters in python function, in the order of python functions' parameter order (even just 1 parameter, it should also be a list). Optional parameters should also be provided.

### 3.3 Other notes

1. It is OK to not call any functions in your response, if user doesn't request or can't fulfilled by our functions.
2. In one response, can only contain at most 2 text parts. Text can only be in the beginning or at end, cannot be in the middle.
3. Must contain text part, even if user just requires to call functions and there is no problems, you should also tell what you have done in text.
4. This is a chatting mode, so you need to rememebr user's previous messages, and answer new questions based on the chatting history smartly.
5. Interact with the user directly, (i.e. use more you and I)

## 4. User Input and Error Handling

In general, you should do best effort to match user's input (i.e. if the user's input is not precise or match our functionality that much, as long as it is clear that which one to call, you should do so). You are not allowed to interpret or execute user's input.

But if user asks a vague function (that you are not sure which function to call), tell user and asks user which option to choose. PLEASE ask user to do choice, DO NOT select by yourself. For example, if user only asks "the expression of XXX", it's unclear, you should ask user to choose.

Only do what user asks, DO NOT call extra functions user does not request.

Only call functions or generate images when user asks to, do not do this if user only asks "What is XXX" or "Can you tell me XXX" etc.

Answer all the questions in the context of GutOmicsAtlas. But you are still allowed to answer completely unrelated questions.


## 5. Output Requirements

Please output in json directly, without any other explantion. The outest later must be list. NO any additional json layer, NO any additional key or item."""


LOG_PATH = '../openai_logs.txt'

assert (sha256(PROMPT.encode('utf-8')).hexdigest() == '0aad2d1e9bb3f063ed3ad8404bce2b274bb05441a43e7d5cc4d2b2625fd398bd')
# print(sha256(PROMPT.encode('utf-8')).hexdigest())
# raise

from config import api_key, anthropic_model

client = anthropic.Anthropic(api_key=api_key)

rate_limit_records = []

def within_rate_limit():
    t = time()
    for i in range(len(rate_limit_records)-1, -1, -1):
        if (t - rate_limit_records[i] > 3600):
            rate_limit_records.pop(i)
    if(len(rate_limit_records) >= 100):
        return False
    rate_limit_records.append(t)
    return True


def check_json_format(text: str) -> None:
    data = json.loads(text, strict=False)
    assert (type(data) == list and len(data) > 0), "Outest layer must be list."
    text_cnt = 0
    for msg in data:
        assert (type(msg) == str or (type(msg) == dict and 'name' in msg and 'parameters' in msg)), "The item of the outest list should be either a string or a dict with keys \"name\" and \"parameters\"."
        if (type(msg) == dict):
            assert (type(msg['name']) == str and type(msg['parameters']) == list), '"name" should be a string, and "parameters" should be a list.'
        text_cnt += int(type(msg) == str)
    assert (text_cnt <= 2 and text_cnt >= 1), "Your output should contain at most 2 text parts, and at least 1 text part."


def check_format(resp: str) -> None:
    '''
    returns: (success, error_msg)
    '''
    check_json_format(resp)
    resp = json.loads(resp, strict=False)
    for msg in resp:
        if (type(msg) == str):
            continue
        func_name = msg['name']
        assert (func_name in ['scRNA', 'snATAC', 'spatial_transcriptomics', 'spatial_metabolomics', 'static_images', 'glkb_ai_assistant']), f"Function {func_name} is not valid."
        parameters = msg['parameters']
        if (func_name == 'scRNA'):
            assert (len(parameters) == 2), "scRNA accepts exactly 2 parameters."
            assert (type(parameters[0]) == str and format_gene(parameters[0]) in rna_atac_genes_formatted_to_origin), f'Gene {parameters[0]} is not available in scRNA.'
            assert (type(parameters[1]) == str and parameters[1] in ['epithelial', 'enteroendocrine'])
        if (func_name == 'snATAC'):
            assert (len(parameters) == 2), "snATAC accepts exactly 2 parameters."
            assert (type(parameters[0]) == str and format_gene(parameters[0]) in rna_atac_genes_formatted_to_origin), f'Gene {parameters[0]} is not available in snATAC.'
            assert (type(parameters[1]) == str and parameters[1] in ['all', 'epithelial'])
        if (func_name == 'spatial_transcriptomics'):
            assert (len(parameters) == 1), "spacial_transcriptomics accepts exactly 1 parameter."
            assert (type(parameters[0]) == str and format_gene(parameters[0]) in st_genes_formatted_to_origin), f'Gene {parameters[0]} is not available in spatial transcriptomics.'
        if (func_name == 'spatial_metabolomics'):
            assert (len(parameters) == 1), "spatial_metabolomics accepts exactly 1 parameter."
            assert (type(parameters[0]) == str and parameters[0] in spatial_meta), f'Chemical {parameters[0]} is not available in spatial metabolomics.'
        if (func_name == 'static_images'):
            assert (len(parameters) == 1)
            assert (type(parameters[0]) == str and parameters[0] in ['scRNA_Epithelial', 'scRNA_Enteroendocrine', 'snATAC_all', 'snATAC_Epitheliel', 'st_umap_dot', 'st_duodenum_colon']), f"Name {parameters[0]} not found in static images."
        if (func_name == 'glkb_ai_assistant'):
            assert (len(parameters) == 1), "glkb_ai_assistant accepts exactly 1 parameter."
            assert (type(parameters[0]) == str), "The parameter of glkb_ai_assistant should be a string."
        


def get_gpt_resp(history: list) -> Tuple[bool, str, str]:
    '''
    returns: (success, error_msg, response)
    
    will modify the history
    '''
    # history = deepcopy(history)
    trial = 3
    while (trial > 0):
        trial -= 1
        try:
            response = client.messages.create(
                model=anthropic_model,
                temperature=0.2,
                messages=history,
                max_tokens=3072,
                system=PROMPT,
            )
            result = response.content[0].text
            print(result)
            log_queue.put(json.dumps({'history': history, 'response': result}, ensure_ascii=False))
        except Exception:
            tb = traceback.format_exc()
            print(tb)
            try:
                log_queue.put(json.dumps({'anthropic_request_failed': tb}, ensure_ascii=False))
            except Exception:
                pass
            # will not retry if Claude API fails (empty history, auth, network, model, etc.)
            return (False, 'Failed to get the response from GPT. Please copy your input, refresh the page and try again.', '')
        try:
            check_format(result)
            success = True
        except:
            err_msg = traceback.format_exc()
            print(err_msg)
            err_msg += '\n\nEncountered an error, please try to fix this.\nIf this is a format issue, please retry and make sure your response satisfies the format requirement.\nIf the issue is gene not found, you can either try again or tell user the problem.'
            success = False
        if (success):
            history.append({'role': 'assistant', 'content': result})
            print(f'======== GPT success after {3-trial} trials.')
            return (True, '', result)
        history.append({'role': 'assistant', 'content': result})
        history.append({'role': 'user', 'content': err_msg})
    print('======== GPT fails after 3 trials.')
    return (False, 'GPT returns illegal format after max retries. Please copy your input, refresh the page and try again.', '')


def glkb_chat(question: str) -> tuple[bool, str]:
    try:
        client = openai.OpenAI(base_url='http://104.187.142.167:40682/v1', api_key='123456')
        response = client.chat.completions.create(
            model='my-model',
            messages=[
                {'role': 'user', 'content': question}
            ]
        )
        result = response.choices[0].message.content
        return (True, result)
    except:
        err_msg = traceback.format_exc()
        return (False, err_msg)


def generate_messgae(resp: str) -> str:
    messages = []
    resp = json.loads(resp, strict=False)
    for msg in resp:
        if (type(msg) == str):
            messages.append({'type': 'text', 'content': msg})
        else:
            file_name = secrets.token_hex(64) + '.pdf'
            R_file_name = '/root/docker_data/' + file_name
            py_file_name = '../docker_data/' + file_name
            if (msg['name'] == 'scRNA' and msg['parameters'][1] == 'epithelial'):
                id = 25
                gene = rna_atac_genes_formatted_to_origin[format_gene(msg['parameters'][0])]
                success, error = R_call(id, {'p1': gene, 'p2': R_file_name})
                png_bytes = pdf_to_png_bytes(py_file_name)
                messages.append({'type': 'image', 'content': 'data:image/png;base64,' + binToBase64(png_bytes)})
            elif (msg['name'] == 'scRNA' and msg['parameters'][1] == 'enteroendocrine'):
                id = 24
                gene = rna_atac_genes_formatted_to_origin[format_gene(msg['parameters'][0])]
                success, error = R_call(id, {'p1': gene, 'p2': R_file_name})
                png_bytes = pdf_to_png_bytes(py_file_name)
                messages.append({'type': 'image', 'content': 'data:image/png;base64,' + binToBase64(png_bytes)})
            elif (msg['name'] == 'snATAC' and msg['parameters'][1] == 'all'):
                id = 26
                gene = rna_atac_genes_formatted_to_origin[format_gene(msg['parameters'][0])]
                success, error = R_call(id, {'p1': gene, 'p2': R_file_name})
                png_bytes = pdf_to_png_bytes(py_file_name)
                messages.append({'type': 'image', 'content': 'data:image/png;base64,' + binToBase64(png_bytes)})
            elif (msg['name'] == 'snATAC' and msg['parameters'][1] == 'epithelial'):
                id = 27
                gene = rna_atac_genes_formatted_to_origin[format_gene(msg['parameters'][0])]
                success, error = R_call(id, {'p1': gene, 'p2': R_file_name})
                png_bytes = pdf_to_png_bytes(py_file_name)
                messages.append({'type': 'image', 'content': 'data:image/png;base64,' + binToBase64(png_bytes)})
            elif (msg['name'] == 'spatial_transcriptomics'):
                gene = st_genes_formatted_to_origin[format_gene(msg['parameters'][0])]
                messages.append({'type': 'image', 'content': f'http://128.84.40.118/data/st/{gene}.png'})
            elif (msg['name'] == 'spatial_metabolomics'):
                index = spatial_meta.index(msg['parameters'][0]) + 1
                messages.append({'type': 'image', 'content': f'http://128.84.40.118/data/sm/Slide{index}.png'})
            elif (msg['name'] == 'static_images'):
                with open(f'./imgs/ai/{msg["parameters"][0]}.png', 'rb') as f:
                    png_bytes = f.read()
                messages.append({'type': 'image', 'content': 'data:image/png;base64,' + binToBase64(png_bytes)})
            elif (msg['name'] == 'glkb_ai_assistant'):
                question = msg['parameters'][0]
                success, answer = glkb_chat(question)
                if (success == False):
                    answer = 'Failed to get the answer from GLKB AI assistant.'
                messages.append({'type': 'text', 'content': f'Ask GLKB AI assistant: {question}\n\nAnswer: {answer}'})
    return messages
            

def process_ai_chat(request, path:str):
    print('AI chat')
    user_input = request.rfile.read(int(request.headers['Content-Length'])).decode('utf-8')
    if(within_rate_limit() == False):
        request.send_response(429)
        request.send_header('Connection', 'keep-alive')
        request.send_header('Content-Length', 0)
        request.send_header('Access-Control-Allow-Origin', '*')
        request.end_headers()
        request.wfile.write(b'')
        request.wfile.flush()
        return
    try:
        history: list = json.loads(user_input)
    except json.JSONDecodeError:
        bad = b'Invalid JSON body'
        request.send_response(400)
        request.send_header('Connection', 'keep-alive')
        request.send_header('Content-Length', len(bad))
        request.send_header('Access-Control-Allow-Origin', '*')
        request.end_headers()
        request.wfile.write(bad)
        request.wfile.flush()
        return
    if not isinstance(history, list) or len(history) == 0:
        bad = b'History must be a non-empty JSON array of {role, content} objects (same as the browser sends).'
        request.send_response(400)
        request.send_header('Connection', 'keep-alive')
        request.send_header('Content-Length', len(bad))
        request.send_header('Access-Control-Allow-Origin', '*')
        request.end_headers()
        request.wfile.write(bad)
        request.wfile.flush()
        return
    for item in history:
        if not isinstance(item, dict) or item.get('role') not in ('user', 'assistant') or not isinstance(item.get('content'), str):
            bad = b'Each history item must be {"role": "user"|"assistant", "content": "<string>"}.'
            request.send_response(400)
            request.send_header('Connection', 'keep-alive')
            request.send_header('Content-Length', len(bad))
            request.send_header('Access-Control-Allow-Origin', '*')
            request.end_headers()
            request.wfile.write(bad)
            request.wfile.flush()
            return
    error_msg = ''
    log_queue.put(json.dumps({'history': history}, ensure_ascii=False))
    success, error_msg, result = get_gpt_resp(history)
    if(error_msg != ''):
        request.send_response(500)
        error_msg = error_msg.encode('utf-8')
        request.send_header('Content-Length', len(error_msg))
        request.send_header('Connection', 'keep-alive')
        request.send_header('Access-Control-Allow-Origin', '*')
        request.end_headers()
        request.wfile.write(error_msg)
        request.wfile.flush()
        return
    messages = []
    messages = generate_messgae(result)
        
    request.send_response(200)
    resp_data = json.dumps({'history': history, 'messages': messages}, ensure_ascii=False)
    resp_data = resp_data.encode('utf-8')
    request.send_header('Content-Length', len(resp_data))
    request.send_header('Connection', 'keep-alive')
    request.send_header('Access-Control-Allow-Origin', '*')
    request.end_headers()
    request.wfile.write(resp_data)
    request.wfile.flush()
    return

log_file = None
log_queue = Queue()

try:
    f = open(LOG_PATH, 'r')
except:
    log_file = open(LOG_PATH, 'w')
if (log_file == None):
    f.close()
    log_file = open(LOG_PATH, 'a')
    log_file.write('\n\n')


def write_logs():
    log_file.write(format(time() * 1000, '.3f') + ': Server started\n')
    log_file.flush()
    while True:
        l = log_queue.get()
        current_time = format(time() * 1000, '.3f')
        l = current_time + ': ' + l + '\n'
        log_file.write(l)
        log_file.flush()

start_new_thread(write_logs, ())
