import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import './App.css';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import Divider from '@material-ui/core/Divider';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import InboxIcon from '@material-ui/icons/MoveToInbox';
import MailIcon from '@material-ui/icons/Mail';

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
}));

const DEFAULT_URL = "https://arxiv.org/pdf/1708.08021.pdf";

function PdfLoader({ url, children, beforeLoad }) {
  const [pdfDocument, setPdfDocument] = useState(null);

  useEffect(() => {
    pdfjsLib.getDocument(url).then(document => setPdfDocument(document))
  });

  return pdfDocument ? children(pdfDocument) : beforeLoad;
}

function App() {
  const classes = useStyles();
  const theme = useTheme();

  const [open, setOpen] = React.useState(false);
  const [highlights, setHighlights] = React.useState([]);

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
      <List>
        {['Inbox', 'Starred', 'Send email', 'Drafts'].map((text, index) => (
          <ListItem button key={text}>
            <ListItemIcon>{index % 2 === 0 ? <InboxIcon /> : <MailIcon />}</ListItemIcon>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        {['All mail', 'Trash', 'Spam'].map((text, index) => (
          <ListItem button key={text}>
            <ListItemIcon>{index % 2 === 0 ? <InboxIcon /> : <MailIcon />}</ListItemIcon>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List>
    </div>
  );

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

  const url = DEFAULT_URL;

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
          <Button color="inherit">Annotate</Button>
          <Button color="inherit">Suggest</Button>
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
          <PdfLoader url={url} beforeLoad={<div />}>
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
          </PdfLoader>
        </div>
      </div>
    </div>
  );
}

export default App;
