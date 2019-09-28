from tika import parser
import spacy
from spacy.gold import GoldParse

raw = parser.from_file('62MnuXfKvT1.pdf')
print(raw['content'])

nlp = MODELS["en_core_web_sm"]
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

doc = nlp(raw['content'])
print({"result": [
    {"start": ent.start_char, "end": ent.end_char, "label": ent.label_,
     "word": raw['content'][ent.start_char:ent.end_char]}
    for ent in doc.ents
]})