const express = require('express');
const promisify = require('promisify-node');
const fs = require('fs');
const path = require('path');

const deepGet = (object, path) => {
  let current = object;

  path.split('/').filter(e => e.length).forEach(e => {
    current = object[e];
  });

  return current;
};

module.exports = app => {
  app.use(express.json());

  app.get('/api/list_documents', async (req, res) => {
    let files = {};
    pathQueue = [];

    let root = `${process.env.HOME}/Documents/Redactions`;
    pathQueue.push(root);

    // BFS
    while (pathQueue.length !== 0) {
      let directory = pathQueue.pop();
      let contents = [];
      try {
        contents = await promisify(fs.readdir)(directory);
      } catch (e) {
        contents = [];
      }

      for (let name of contents) {
        let key = directory.slice(root.length);
        let isDirectory = (await promisify(fs.statSync(`${directory}/${name}`))).isDirectory();

        if (isDirectory) {
          pathQueue.push(`${directory}/${name}`);
        }
        deepGet(files, key)[name] = (isDirectory ? {} : path.extname(name).slice(1));
      }
    }

    res.json({
      'status': "ok",
      'data': files
    });
  });

  app.get('/api/pdf/:rest', async (req, res) => {
    let path = req.params.rest;

    let root = `${process.env.HOME}/Documents/Redactions`;
    var data = fs.readFileSync(`${root}/${path}`);
    res.contentType("application/pdf");
    res.send(data);
  });
};