'use strict';

var GitHulk = require('githulk')
  , Dynamis = require('dynamis')
  , Page = require('bigpipe').Page
  , Registry = require('npm-registry')
  , nodejitsu = require('nodejitsu-app');

//
// Get nodejitsu-app configuration and caching layer.
//
var configuration = nodejitsu.config
  , couchdb = configuration.get('couchdb')
  , redisConf = configuration.get('redis');

//
// Initialize the cache persistance layers for both CouchDB and Redis.
//
var cradle = new (require('cradle')).Connection(couchdb)
  , redis = require('redis').createClient(redisConf.port, redisConf.host);

//
// Initialize GitHulk and provide a CouchDB cache layer.
//
var githulk = new GitHulk({
  cache: new Dynamis('cradle', cradle, couchdb),
  token: configuration.get('github')
});

//
// Initialize Registry.
//
var registry = new Registry({
  githulk: githulk,
  registry: configuration.get('registry')
});

//
// Extend the default page.
//
Page.extend({
  path: '/package/:name',
  view: '../views/package.ejs',

  pagelets: {
    navigation: require('../contour').navigation.extend({
      data: {
        base: '',
        login: false,
        signup: false,
        navigation: [
          { name: 'Explore', href: '/' },
          // { name: 'Packages', href: '/packages/' },
          // { name: 'Authors', href: '/authors/' },
          { name: 'Node.js', href: 'http://nodejs.org', target: 'blank' },
          { name: 'Help', href: '/help/' }
        ]
      }
    }),

    package: require('packages-pagelet').extend({
      cache: new Dynamis('redis', redis, redisConf),
      dependenciesPagelet: '/dependencies',
      registry: registry,
      githulk: githulk
    }),

    //footer: require('../contour').footer
  }
}).on(module);
