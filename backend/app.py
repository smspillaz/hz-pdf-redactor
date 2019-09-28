from __future__ import unicode_literals

from flask import Flask, request
from flask_cors import CORS
import spacy
from spacy.gold import GoldParse
import random
from tika import parser

app = Flask(__name__)
CORS(app)

MODELS = {
    "en_core_web_sm": spacy.load("en_core_web_sm"),
    # "en_core_web_md": spacy.load("en_core_web_md"),
    # "en_core_web_lg": spacy.load("en_core_web_lg"),
    # "de_core_news_sm": spacy.load("de_core_news_sm"),
    # "es_core_news_sm": spacy.load("es_core_news_sm"),
    # "pt_core_news_sm": spacy.load("pt_core_news_sm"),
    # "fr_core_news_sm": spacy.load("fr_core_news_sm"),
    # "it_core_news_sm": spacy.load("it_core_news_sm"),
    # "nl_core_news_sm": spacy.load("nl_core_news_sm"),
}


def get_model_desc(nlp, model_name):
    """Get human-readable model name, language name and version."""
    lang_cls = spacy.util.get_lang_class(nlp.lang)
    lang_name = lang_cls.__name__
    model_version = nlp.meta["version"]
    return "{} - {} (v{})".format(lang_name, model_name, model_version)


@app.route("/models", methods=['GET'])
def models():
    return {name: get_model_desc(nlp, name) for name, nlp in MODELS.items()}


# @app.route("/dep", methods=['POST'])
# def dep(
#     text: str,
#     model: str,
#     collapse_punctuation: bool = False,
#     collapse_phrases: bool = False,
# ):
#     """Get dependencies for displaCy visualizer."""
#     nlp = MODELS[model]
#     doc = nlp(text)
#     options = {
#         "collapse_punct": collapse_punctuation,
#         "collapse_phrases": collapse_phrases,
#     }
#     return spacy.displacy.parse_deps(doc, options)


@app.route("/ent", methods=['POST'])
def ent():
    """Get entities for displaCy ENT visualizer."""
    model = request.json["model"]
    text = request.json["text"]
    nlp = MODELS[model]
    doc = nlp(text)
    return {"result":[
        {
            "start": ent.start_char,
            "end": ent.end_char,
            "label": ent.label_,
            "word": text[ent.start_char:ent.end_char]
        }
        for ent in doc.ents
    ]}

@app.route("/addClassifier", methods=['POST'])
def addClassifier():
    pass

@app.route("/parseFile", methods=['POST'])
def parseFile():
    model = request.json["model"]
    text = request.json["text"]
    nlp = MODELS[model]
    doc = nlp(text)
    return {"result": [
        {"start": ent.start_char, "end": ent.end_char, "label": ent.label_,
         "word": text[ent.start_char:ent.end_char]}
        for ent in doc.ents
    ]}

def testMethod():
    raw = parser.from_file('62MnuXfKvT1.pdf')
    print(raw['content'])
    nlp = MODELS["en_core_web_sm"]
    doc = nlp(raw['content'])
    return {"result": [
        {"start": ent.start_char, "end": ent.end_char, "label": ent.label_, "word":raw['content'][ent.start_char:ent.end_char]}
        for ent in doc.ents
    ]}

def train_ner(nlp, training_data, iterations, entity_types):
    """Use the training data to update the model."""
    for label in entity_types:
        nlp.entity.add_label(label)

    for text, _ in training_data:
        for word in nlp.make_doc(text):
            nlp.vocab[word.orth]  # suppress(pointless-statement)

    for _ in range(0, iterations):
        random.shuffle(training_data)
        loss = 0

        for raw_text, offsets in training_data:
            doc = nlp.make_doc(raw_text)
            gold = GoldParse(doc, entities=offsets)
            nlp.tagger(doc)
            loss += nlp.entity.update(doc, gold)

        yield loss / len(training_data)

    nlp.end_training()

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0')
