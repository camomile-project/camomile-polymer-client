# camomile-polymer-client

## Demo

You can try it on the github pages demo at [https://camomile-project.github.io/camomile-polymer-client/](https://camomile-project.github.io/camomile-polymer-client/)
using `https://camomile.rom1504.fr` as the endpoint, `root` as user and `test` as password

## Specifications

![specifications](specifications.jpg)

The objective of this project is to define [web components](https://www.webcomponents.org/) using [polymer](https://www.polymer-project.org/)
to make it easier to create camomile clients.

Examples :
* index.html with my-app.html and camomile-admin.html and camomile-annotation.html
* a one file example in simple-demo.html

## Implementation

Polymer 2.0 will be used to implement these components.

[polymer 2.0 quick start](https://www.polymer-project.org/2.0/start/quick-tour) explains that polymer components are defined as classes.
So defining the needed components for camomile will consist in defining the relevant classes.

## Installation

* npm install -g polymer-cli
* npm install -g bower
* npm install
* bower install

## Run

* polymer serve

## Deploy to github pages

* npm run gh-publish

