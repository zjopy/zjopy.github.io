# Readme

This is my personal website. It is built with Eleventy, and hosted on GitHub Pages. Using the NPM scripts it can be built for development or production. For production it is built into the `docs` folder, while for production to the `build` folder.



## Todo

## Fix

- back button on post and project page, or navigation if can make `reset.css` work
- meaningful frontmatter descriptions

### Functional

- previous and next links at end of blog posts
- RSS feed
- blog post tags
- analytics
- contact form: Formcarry, Netlify Forms
- meta tags (SEO, Facebook Open Graph, Twitter Cards)
- code highlighting: highlight.js
- share buttons: sharer.js

### Visual

- hamburger menu



## Note

- remember to change sitemap priority and frequency if behavior changes



## Keys

- date: creation date, specify once and don't change, because used for sorting, uses 00:00 UTC if no time specified
- sitemap ignore: true to prevent adding to sitemap, default is false
- can't yet use custom processing functions for frontmatter keys, e.g. parse an `update` field as a JavaScript date object