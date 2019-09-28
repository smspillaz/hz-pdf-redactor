import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import './App.css';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import Divider from '@material-ui/core/Divider';
import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import TreeItem from '@material-ui/lab/TreeItem';

import {
  PdfHighlighter,
  Highlight,
  Popup,
  AreaHighlight
} from 'react-pdf-highlighter';

import pdfjsLib from 'pdfjs-dist/webpack';

const drawerWidth = 240;

const getNextId = () => String(Math.random()).slice(2);

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexGrow: 1,
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
}));

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
    getIndicesOf(s.content.text, text, true).map(idx => ([idx, idx + s.content.text.length, 'REDACTED']))
  ).reduce(
    (all, a) => all.concat(a), []
  );
}

function App() {
  const classes = useStyles();
  const theme = useTheme();

  const [open, setOpen] = React.useState(false);
  const [highlights, setHighlights] = React.useState([]);
  const [documentTree, setDocumentTree] = React.useState({});
  const [pdfText, setPdfText] = React.useState('');
  const [pdfDocument, setPdfDocument] = React.useState(null);
  const [url, setUrl] = React.useState(DEFAULT_URL);

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
        debugger;
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
          <Button
            color="inherit"
            onClick={() =>
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
                    offsets: findHighlightOffsets(pdfText, highlights),
                  }
                }),
              })}
          >
            Annotate
          </Button>
          <Button
            color="inherit"
            disabled={!pdfText}
            onClick={() =>
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
              }).then(r => r.json()).then(r => console.log(r))
            }>Suggest</Button>
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
          <RenderOnPdfAvailable pdfDocument={pdfDocument} beforeLoad={<div />}>
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
                  addHighlight({ content, position, comment: '' })
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
                      position={highlight.position}
                      comment={highlight.comment}
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
