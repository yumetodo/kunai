const path = require('path');
const URL = require('url');

const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const PJ = require('./package.json')
const CRS_PJ = require('crsearch/package.json')


function isExternal(module) {
  var context = module.context;

  if (typeof context !== 'string') {
    return false;
  }

  return context.indexOf('node_modules') !== -1;
}


module.exports = env => ({
  js: {
    context: path.resolve(__dirname, 'js'),
    entry: {
      kunai: './kunai',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'js/[name].js',
      library: 'Kunai',
      libraryTarget: 'window',
      libraryExport: 'Kunai',
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ExtractTextPlugin.extract({
            use: [
              {
                loader: 'css-loader',
                options: {
                  minimize: true,
                  sourceMap: false,
                }
              },
            ],
          }),
          include: [
            path.resolve(__dirname, 'js'),
            path.resolve(__dirname, 'node_modules'),
          ],
        },
        {
          test: /\.js$/,
          use: [
            {
              loader: 'babel-loader',
            },
          ],
          include: [
            path.resolve(__dirname, 'js'),
            path.resolve(__dirname, 'node_modules', 'nagato'),
            path.resolve(__dirname, 'node_modules', 'crsearch'),
          ],
        },
        {
          test: /\.md$/,
          use: [
            {
              loader: 'raw-loader',
            },
          ],
        },
      ],
    },
    plugins: [
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
      }),
      new webpack.DefinePlugin({
        KUNAI_PACKAGE: JSON.stringify({
          version: PJ.version,
          bugs_url: PJ.bugs.url,
        }),
        CRS_PACKAGE: JSON.stringify({
          version: CRS_PJ.version,
          bugs_url: CRS_PJ.bugs.url,
        }),
      }),
      new webpack.optimize.CommonsChunkPlugin({
        name: 'kunai-vendor',
        chunks: ['kunai'],
        minChunks: function(module) {
          return isExternal(module);
        },
      }),
      new ExtractTextPlugin({
        filename: 'css/kunai-stage-1.css',
        disable: false,
        allChunks: true,
      }),
    ],
  },
  css: {
    context: path.resolve(__dirname, 'css'),
    entry: {
      'kunai-stage-0': './kunai-stage-0.css',
      'kunai-stage-2': './kunai-stage-2.scss',
      'kunai-stage-3': './kunai-stage-3.css',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'css/[name].css',
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: ExtractTextPlugin.extract({
            use: [
              {
                loader: 'css-loader',
                options: {
                  // minimize: true,
                  importLoaders: 2,
                },
              },
              {
                loader: 'postcss-loader',
                options: {
                  config: {
                    ctx: {
                      env: env,
                    },
                  },
                },
              },
              {
                loader: 'sass-loader',
              },
            ],
          }),
        },
        {
          test: /\.css$/,
          use: ExtractTextPlugin.extract({
            // fallback: 'style-loader',
            use: [
              {
                loader: 'css-loader',
                options: {
                  // minimize: true,
                  // sourceMap: true,
                  importLoaders: 1,
                }
              },
              {
                loader: 'postcss-loader',
                options: {
                  config: {
                    ctx: {
                      env: env,
                      cssnano: {
                        cssProcessorOptions: {
                          // http://cssnano.co/optimisations/reduceidents/
                          reduceIdents: false,
                        },
                      },
                    },
                  },
                },
              },
              // {
                // loader: 'sass-loader',
              // },
            ],
          }),
        },
        {
          test: /\.(ttf|eot|svg|woff(2)?)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]?[hash]',
                publicPath: '../',
                outputPath: 'fonts/',
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new ExtractTextPlugin({
        filename: 'css/[name].css',
        disable: false,
        allChunks: true,
      }),
    ]
  },
})

