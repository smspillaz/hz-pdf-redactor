from __future__ import unicode_literals

from flask import Flask, request
from flask_cors import CORS
import spacy
from spacy.gold import GoldParse
import random
from tika import parser
from pathlib import Path
from spacy.util import minibatch, compounding
from pdf_redactor.pdf_redactor import redactor, RedactorOptions

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
    # "latest": spacy.blank("en").from_disk(Path.home() / 'models' / 'latest')
    # "latest": spacy.blank("en").from_disk((Path.home() / 'models' / 'latest').mkdir(parents=True, exist_ok=True))
    # spacy.blank("en").from_disk("/path/to/data")
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

@app.route("/update", methods=['POST'])
def update():
    """Update entities based on annotation (and annotate document)."""
    model = request.json["model"]

    redactions = request.json["redactions"]
    text = redactions["text"]
    offsets = redactions["offsets"]
    entities = [tuple(o) for o in offsets]
    train_data = [(text, {"entities": entities})]
    print(offsets)

    train_model(train_data=train_data, model=model, new_model_name='redacted', output_dir=Path.home() / 'models' / 'latest')
    return {
        "status": "ok",
        "result": "redacted"
    }


def testMethod():
    raw = parser.from_file('62MnuXfKvT1.pdf')
    print(raw['content'])
    nlp = MODELS["en_core_web_sm"]
    doc = nlp(raw['content'])
    return {"result": [
        {"start": ent.start_char, "end": ent.end_char, "label": ent.label_, "word":raw['content'][ent.start_char:ent.end_char]}
        for ent in doc.ents
    ]}

def train_model(train_data, labels = ["REDACTED"], model=None, new_model_name='new_model', output_dir=None, n_iter=1):
    """Setting up the pipeline and entity recognizer, and training the new entity."""
    if model is not None:
        nlp = spacy.load(model)  # load existing spacy model
        print("Loaded model '%s'" % model)
    else:
        nlp = spacy.blank('en')  # create blank Language class
        print("Created blank 'en' model")

    if 'ner' not in nlp.pipe_names:
        ner = nlp.create_pipe('ner')
        nlp.add_pipe(ner)
    else:
        ner = nlp.get_pipe('ner')

    for i in labels:
        ner.add_label(i)   # Add new entity labels to entity recognizer

    if model is None:
        optimizer = nlp.begin_training()
    else:
        optimizer = nlp.entity.create_optimizer()

    # Get names of other pipes to disable them during training to train only NER
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != 'ner']
    with nlp.disable_pipes(*other_pipes):  # only train NER
        for itn in range(n_iter):
            random.shuffle(train_data)
            losses = {}
            batches = minibatch(train_data, size=compounding(4., 32., 1.001))
            for batch in batches:
                texts, annotations = zip(*batch)
                nlp.update(texts, annotations, sgd=optimizer, drop=0.35,
                           losses=losses)
            print('Losses', losses)

    # Save model 
    if output_dir is not None:
        if not output_dir.exists():
            output_dir.mkdir()
        nlp.meta['name'] = new_model_name  # rename model
        nlp.to_disk(output_dir)
        print("Saved model to", output_dir)


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0')
