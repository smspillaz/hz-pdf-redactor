import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import './App.css';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer';
import MenuItem from '@material-ui/core/MenuItem';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import Select from '@material-ui/core/Select';
import Divider from '@material-ui/core/Divider';
import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import TreeItem from '@material-ui/lab/TreeItem';

import amber from '@material-ui/core/colors/amber';
import orange from '@material-ui/core/colors/orange';
import red from '@material-ui/core/colors/red';
import pink from '@material-ui/core/colors/pink';
import deepPurple from '@material-ui/core/colors/deepPurple';
import blue from '@material-ui/core/colors/blue';
import teal from '@material-ui/core/colors/teal';
import lime from '@material-ui/core/colors/lime';

import {
  PdfHighlighter,
  Highlight,
  Popup,
  AreaHighlight
} from 'react-pdf-highlighter';

import {
  getPageFromRange,
  getPageFromElement,
  findOrCreateContainerLayer
} from "react-pdf-highlighter/lib/lib/pdfjs-dom";

import getBoundingRect from "react-pdf-highlighter/lib/lib/get-bounding-rect";
import getClientRects from "react-pdf-highlighter/lib/lib/get-client-rects";
import { viewportToScaled } from "react-pdf-highlighter/lib/lib/coordinates";

import pdfjsLib from 'pdfjs-dist/webpack';

const drawerWidth = 240;

const getNextId = () => String(Math.random()).slice(2);

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
  },
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: -drawerWidth,
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  },
  grow: {
    flexGrow: 1
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
  list: {
    width: 250,
  },
  fullList: {
    width: 'auto',
  },
  treeView: {
    height: 216,
    flexGrow: 1,
    maxWidth: 400,
  },
  selectRoot: {
    color: 'white',
    lineHeight: '0px',
    fontSize: '15px',
    '& div': {
      paddingTop: '18px',
      paddingBottom: '18px'
    }
  },
}));

const selectColors = {
  'PERSON': amber,
  'ADDRESS': orange,
  'ORG': red,
  'GPE': pink,
  'DATE': deepPurple,
  'TIME': blue,
  'PERCENT': lime,
  'MONEY': teal
};

const selectColorsStyles = makeStyles(theme => Object.keys(selectColors).reduce((acc, k) => ({
  ...acc,
  [k]: {
    backgroundColor: selectColors[k][500]
  }
}), {}));

const DEFAULT_URL = "https://arxiv.org/pdf/1708.08021.pdf";

function RenderOnPdfAvailable({ children, pdfDocument, beforeLoad }) {
  return pdfDocument ? children(pdfDocument) : beforeLoad;
}

function RecursiveTreeItem({ nodeId, label, tree, callback, abspath }) {
  return (
    <TreeItem nodeId={nodeId} label={label}>
      {Object.keys(tree).map((key, i) => (
        typeof(tree[key]) === 'object' ? (
          <RecursiveTreeItem nodeId={`${i}`} label={key} tree={tree[key]} key={key} callback={callback} abspath={[abspath, key].join('/')}/>
        ) : <TreeItem nodeId={`${i}`} label={key} key={key} onClick={()=>callback([abspath, key].join('/'))} />
      ))}
    </TreeItem>
  )
}

function FileSystemNavigator({ tree, callback }) {
  const classes = useStyles();

  return (
    <TreeView
      className={classes.treeView}
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
    >
      <RecursiveTreeItem nodeId={"1"} tree={tree} label="/" callback={callback} abspath="" />
    </TreeView>
  );
};



const getPageText = async (pdf, pageNo) => {
  const page = await pdf.getPage(pageNo);
  const tokenizedText = await page.getTextContent();
  const pageText = tokenizedText.items.map(token => token.str).join("");
  return pageText;
};

export const getPDFText = async (pdfDocument) => {
  const maxPages = pdfDocument.numPages;
  const pageTextPromises = [];
  for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
    pageTextPromises.push(getPageText(pdfDocument, pageNo));
  }
  const pageTexts = await Promise.all(pageTextPromises);
  return pageTexts.join(" ");
};

function getIndicesOf(searchStr, str, caseSensitive) {
  var searchStrLen = searchStr.length;
  if (searchStrLen == 0) {
      return [];
  }
  var startIndex = 0, index, indices = [];
  if (!caseSensitive) {
      str = str.toLowerCase();
      searchStr = searchStr.toLowerCase();
  }
  while ((index = str.indexOf(searchStr, startIndex)) > -1) {
      indices.push(index);
      startIndex = index + searchStrLen;
  }
  return indices;
}

function findHighlightOffsets(text, highlights) {
  return highlights.map(s =>
    getIndicesOf(s.content.text, text, true).map(idx => ([idx, idx + s.content.text.length, s.type]))
  ).reduce(
    (all, a) => all.concat(a), []
  );
}

function viewportPositionToScaled({
  pageNumber,
  boundingRect,
  rects
}) {
  const viewport = window.PdfViewer.viewer.getPageView(pageNumber - 1).viewport;

  return {
    boundingRect: viewportToScaled(boundingRect, viewport),
    rects: (rects || []).map(rect => viewportToScaled(rect, viewport)),
    pageNumber
  };
}

// Giant hack of the century
//
// Basically we go through all our text and generate synthetic highlight
// events every time we have a match
function findTextsOnNode(texts) {
  // First deduplicate all the texts
  let textsTypes = texts.reduce((all, t) => ({
    ...all,
    [t.word]: t.label
  }));
  let textsSet = Array.from([...new Set(texts.map(r => r.word))]);
  let highlights = [];

  // We basically have to do this on promises so that we give enough
  // time to return to the main loop and for the DOM to update ...
  textsSet.forEach((t) => {
    let rectified = t.replace("'", "");
    const query = document.evaluate(`//div[text()[contains(.,'${rectified}')]]`, document);
    let nodes = [];
    let next = query.iterateNext();

    while (next) {
      nodes.push(next);
      next = query.iterateNext();
    }

    // Hopefully this doesn't take too long ...
    for (let node of nodes) {
      let child = node.firstChild;

      let range = document.createRange();

      let idx = child.textContent.indexOf(rectified);
      range.setStart(child, idx);
      range.setEnd(child, idx + rectified.length - 1);

      const page = getPageFromRange(range);

      if (!page) {
        return;
      }

      const rects = getClientRects(range, page.node);

      if (rects.length === 0) {
        return;
      }

      const boundingRect = getBoundingRect(rects);

      const viewportPosition = { boundingRect, rects, pageNumber: page.number };

      const content = {
        text: range.toString()
      };
      const scaledPosition = viewportPositionToScaled(viewportPosition);

      highlights.push({
        position: {
          ...scaledPosition
        },
        content,
        color: selectColors[textsTypes[t]][500],
        type: textsTypes[t]
      });
    }
  });

  return highlights;
}

const REDACTED_LABELS = [
  'PERSON',
  'ADDRESS',
  'ORG',
  'GPE',
  'DATE',
  'TIME',
  'PERCENT',
  'MONEY'
];

function App() {
  const classes = useStyles();
  const selectColorsClasses = selectColorsStyles();
  const theme = useTheme();

  const [open, setOpen] = React.useState(false);
  const [highlights, setHighlights] = React.useState([]);
  const [documentTree, setDocumentTree] = React.useState({});
  const [pdfText, setPdfText] = React.useState('');
  const [pdfDocument, setPdfDocument] = React.useState(null);
  const [url, setUrl] = React.useState(DEFAULT_URL);
  const [suggesting, setSuggesting] = React.useState(false);
  const [highlightType, setHighlightType] = React.useState('PERSON');

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const sideList = side => (
    <div
      className={classes.list}
      role="presentation"
    >
      <div className={classes.drawerHeader}>
        <IconButton onClick={handleDrawerClose}>
          {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </div>
      <Divider />
      <FileSystemNavigator tree={documentTree} callback={e => {
        setUrl(`/api/pdf${e}`);
       }} />
    </div>
  );

  useEffect(() => {
    setPdfDocument(null);
    setPdfText('');
    pdfjsLib.getDocument(url)
      .then(document => {
        setPdfDocument(document);
        return getPDFText(document);
      }).then(text => setPdfText(text));
  }, [url]);

  useEffect(() => {
    fetch('/api/list_documents')
      .then(res => res.json())
      .then((response) => {
        setDocumentTree(response.data);
      });
  }, []);

  const resetHighlights = () => {
    setHighlights([]);
  };

  const getHighlightById = (id) => {
    return highlights.find(highlight => highlight.id === id);
  }

  const addHighlight = (highlight) => {
    console.log("Saving highlight", highlight);
    setHighlights([{ ...highlight, id: getNextId() }, ...highlights]);
  }

  const updateHighlight = (highlightId, position, content) => {
    console.log("Updating highlight", highlightId, position, content);

    setHighlights(highlights.map(h => {
      return h.id === highlightId
        ? {
            ...h,
            position: { ...h.position, ...position },
            content: { ...h.content, ...content }
          }
        : h;
    }));
  };

  const highlightsOverlap = (h1, h2) => {
    var h2x2 = h2.position.boundingRect.left+h2.position.boundingRect.width;
    var h2x1 = h2.position.boundingRect.left;
    var h2y1 = h2.position.boundingRect.top; 
    if (h1.position.boundingRect.x1 <= h2x2 && 
    h1.position.boundingRect.x2 >= h2x1 &&
    Math.abs(h1.position.boundingRect.y1 - h2y1) <= 5) {
      return true;
    }
    else {
      return false;
    }
  }

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar 
        position="fixed"
        className={clsx(classes.appBar, {
          [classes.appBarShift]: open,
        })}
      >
        <Toolbar>
          <IconButton
            edge="start"
            className={classes.menuButton}
            color="inherit"
            onClick={handleDrawerOpen}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" color="inherit" className={classes.grow}>
            {url}
          </Typography>
          <Button
            color="inherit"
            onClick={() => {
              const offsets = findHighlightOffsets(pdfText, highlights);
              fetch('http://localhost:5000/update', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'en_core_web_sm',
                  redactions: {
                    text: pdfText,
                    offsets,
                    labelSnippits: offsets.map(([begin, end, type]) => ({
                      text: pdfText.slice(begin, end),
                      type
                    }))
                  }
                }),
              });
            }}
          >
            Annotate
          </Button>
          <Button
            color="inherit"
            disabled={!pdfText}
            onClick={() => {
              setSuggesting(true);
              fetch('http://localhost:5000/ent', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'en_core_web_sm',
                  text: pdfText
                })
              }).then(
                r => r.json()
              ).then(
                r => findTextsOnNode(r.result.filter(
                  s => REDACTED_LABELS.indexOf(s.label) !== -1
                 ))
              ).then(
                (foundHighlights) => {
                  setHighlights(highlights.concat(foundHighlights.map(h => ({
                    ...h,
                    id: getNextId()
                  }))));
                  setSuggesting(false);
                }
              );
            }}
          >
            Suggest
          </Button>
          <Select
            value={highlightType}
            onChange={event => setHighlightType(event.target.value)}
            variant="filled"
            className={clsx(classes.selectRoot, selectColorsClasses[highlightType])}
          >
            {REDACTED_LABELS.map(l => (
              <MenuItem value={l}>{l}</MenuItem>
            ))}
          </Select>
        </Toolbar>
      </AppBar>
      <Drawer
        open={open}
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        {sideList('left')}
      </Drawer>
      <div
        onClick={(event) => {for (const v of highlights.values()) console.log(v.position.boundingRect) } }
        className={clsx(classes.content, {
          [classes.contentShift]: open,
        })}
      >
        <div className={classes.drawerHeader} />
        <div
          style={{
            height: "100vh",
            width: "75vw",
            overflowY: "scroll",
            position: "relative"
          }}
        >
          <RenderOnPdfAvailable
            pdfDocument={pdfDocument}
            beforeLoad={<div />}>
            {pdfDocument => (
              <PdfHighlighter
                pdfDocument={pdfDocument}
                enableAreaSelection={event => event.altKey}
                onSelectionFinished={(
                  position,
                  content,
                  hideTipAndSelection,
                  transformSelection
                ) => (
                  addHighlight({
                    content,
                    position,
                    color: selectColors[highlightType][200],
                    comment: '',
                    type: highlightType
                  })
                )}
                highlightTransform={(
                  highlight,
                  index,
                  setTip,
                  hideTip,
                  viewportToScaled,
                  screenshot,
                  isScrolledTo
                ) => {
                  const isTextHighlight = !Boolean(
                    highlight.content && highlight.content.image
                  );

                  const component = isTextHighlight ? (
                    <Highlight
                      isScrolledTo={isScrolledTo}
                      position={{
                        ...highlight.position,
                        rects: highlight.position.rects.map(r => ({
                          ...r,
                          backgroundColor: highlight.color,
                        }))
                      }}
                      position={highlight.position}
                      comment={highlight.comment}
                      onClick={ () => {                        
                        setHighlights(highlights.filter(
                          function(hl) {
                            return !highlightsOverlap(hl, highlight)
                            }
                          ))
                      }}
                    />
                  ) : (
                    <AreaHighlight
                      highlight={highlight}
                      onChange={boundingRect => {
                        updateHighlight(
                          highlight.id,
                          { boundingRect: viewportToScaled(boundingRect) },
                          { image: screenshot(boundingRect) }
                        );
                      }}
                    />
                  );

                  return (
                    <Popup
                      popupContent={<div />}
                      onMouseOver={popupContent =>
                        setTip(highlight, highlight => popupContent)
                      }
                      onMouseOut={hideTip}
                      key={index}
                      children={component}
                    />
                  );
                }}
                highlights={highlights}
              />
            )}
          </RenderOnPdfAvailable>
        </div>
      </div>
    </div>
  );
}

export default App;
