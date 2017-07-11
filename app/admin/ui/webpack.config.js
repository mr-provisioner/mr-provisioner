let path = require('path');
let webpack = require('webpack');
let ExtractTextPlugin = require('extract-text-webpack-plugin');
let HtmlWebpackPlugin = require('html-webpack-plugin');
// let FaviconsWebpackPlugin = require('favicons-webpack-plugin')
let WebpackCleanupPlugin = require('webpack-cleanup-plugin');
// let OfflinePlugin = require('offline-plugin');
// let CopyWebpackPlugin = require('copy-webpack-plugin');
let DashboardPlugin = require('webpack-dashboard/plugin');
let BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

let productionPlugins = [
  new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: '"production"'
    }
  }),
  // new webpack.optimize.DedupePlugin(),
  new webpack.LoaderOptionsPlugin({
    minimize: true,
    debug: false,
  }),
  new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
    compress: {
      warnings: false,
      screw_ie8: true,
      drop_console: true,
      drop_debugger: true,
      dead_code: true,
      evaluate: true,
      unused: true,
    },
    output: {
      ascii_only: true,
    },
  }),
  // new webpack.optimize.OccurenceOrderPlugin(),
];

console.log("NODE_ENV: " + process.env.NODE_ENV);

module.exports = {
  devtool: 'source-map',
  entry: {
    app: [
      'babel-polyfill',
      './src/index.jsx',
      './assets/styles/app.scss',
    ],
  },
  output: {
    publicPath: '',
    path: path.join(__dirname, 'public'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|public\/)/,
        use: ["babel-loader"]
      },
      {
        test: /\.json$/,
        use: ["json-loader"]
      },
      {
        test: /\.(graphql|gql)$/,
        exclude: /(node_modules|public\/)/,
        loader: 'graphql-tag/loader',
      },
      {
	test: /\.css$/,
	exclude: /[\/\\]src[\/\\]/,
        loader: ExtractTextPlugin.extract({
          fallbackLoader: {
            loader: "style-loader",
            options: {
              sourceMap: true,
            }
          },
          loader: [
            {
              loader: "css-loader",
              options: {
                importLoaders: 1,
                localIdentName: "[name]__[local]___[hash:base64:5]",
              }
            },
            // 'postcss',
          ],
        })
      },
      {
	test: /\.s?css$/,
	exclude: /[\/\\](node_modules|bower_components|public\/)[\/\\]/,
        loader: ExtractTextPlugin.extract({
          fallbackLoader: {
            loader: "style-loader",
            options: {
              sourceMap: true,
            }
          },
          loader: [
            {
              loader: "css-loader",
              options: {
                importLoaders: 1,
                localIdentName: "[name]__[local]___[hash:base64:5]",
              }
            },
            // 'postcss',
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
                includePaths: ['./node_modules', './node_modules/grommet/node_modules']
              }
            }
          ],
        })
      },
      {
	test: /\.css$/,
	exclude: /[\/\\](node_modules|bower_components|public\/)[\/\\]/,
        loader: ExtractTextPlugin.extract({
          fallbackLoader: {
            loader: "style-loader",
            options: {
              sourceMap: true,
            }
          },
          loader: [
            'css-loader',
            // 'postcss',
          ],
        })
      },
      {
        test: /\.(woff|woff2)$/,
        exclude: /(node_modules|bower_components)/,
        use: [{
          loader: "url-loader",
          options: {
            limit: 5000,
            mimetype: "application/font-woff",
            name: "assets/fonts/[name].[ext]",
          }
        }]
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        exclude: /(node_modules|bower_components)/,
        use: [{
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "application/octet-stream",
            name: "assets/fonts/[name].[ext]",
          }
        }]
      },
      {
        test: /\.png/,
        exclude: /(node_modules|bower_components)/,
        use: [{
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "image/png",
            name: "assets/images/[name].[ext]",
          }
        }]
      },
    ]
  },
  resolve: {
    enforceExtension: false,
    extensions: ['.js', '.jsx', '.json'],
    modules: [
      path.join(__dirname, "src"),
      "node_modules",
    ],
  },
  devServer: {
    contentBase: './public',
    noInfo: true,
    hot: false,
    inline: true,
    historyApiFallback: true,
    port: "8888",
    host: "0.0.0.0",
  },
  plugins: [].concat(
    (process.env.NODE_ENV === 'production') ? productionPlugins : [],
    (process.env.WEBPACK_DASHBOARD === 'true') ? [new DashboardPlugin()] : [], [
    new WebpackCleanupPlugin({
      exclude: ['icons/**'],
    }),
    // new FaviconsWebpackPlugin({
    //   logo: './assets/menu-logo.png',
    //   prefix: 'icons/',
    //   inject: false,
    //   persistentCache: false, /* Otherwise, OfflinePlugin generates an incomplete cache */
    //   icons: {
    //     android: true,
    //     appleIcon: true,
    //     appleStartup: true,
    //     coast: false,
    //     favicons: true,
    //     firefox: false,
    //     opengraph: false,
    //     twitter: false,
    //     yandex: false,
    //     windows: false
    //   },
    // }),
    // new CopyWebpackPlugin([
    //   { from: './assets/manifest.json', to: 'manifest.json' },
    // ], {}),
    new ExtractTextPlugin({
      filename: 'app.css',
      disable: false,
      allChunks: true
    }),
    // new OfflinePlugin({
    //   AppCache: {
    //     directory: 'appcache/',
    //     disableInstall: true,
    //   },
    // }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFileName: 'bundle.report.html',
      defaultSizes: 'parsed',
      generateStatsFile: true,
      statsFilename: 'bundle.stats.json',
      openAnalyzer: false,
    }),
  ]),
};
