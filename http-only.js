const zlib = require('zlib');
const http = require('http');
const { promisify } = require('util');

const { log } = console;

/* Index in Elasticsearch cluster in which the documents will be indexed */
const ELASTICSEARCH_INDEX = 'cloudwatch';

/* Type of the document in Elasticsearch cluster */
const ELASTICSEARCH_TYPE = 'lambda';

/* Data to be posted */
const bulkData = require('./data.json');

const gzipP = promisify(zlib.gzip.bind(zlib));

/*  Elasticsearch Bulk API needs data to be in this format
    https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html
 */
const mapRecordsToElasticSearchBulk = records => `${records.reduce(
  (mappedRecords, record) => mappedRecords.concat([
    JSON.stringify({
      index: {
        _index: ELASTICSEARCH_INDEX,
        _type: ELASTICSEARCH_TYPE
      }
    }),
    JSON.stringify(record)
  ]), []
).join('\n')}\n`;

const makeRequest = records => new Promise((resolve, reject) => {
  let responseData = '';
  const request = http.request({
    headers: {
      'accept-encoding': 'gzip, deflate',
      'content-type': 'application/x-ndjson',
      'content-encoding': 'gzip',
      connection: 'keep-alive'
    },
    host: 'localhost',
    port: 9200,
    method: 'POST',
    path: '_bulk'
  }, (response) => {
    /*  the response from elasticsearch would be gzipped,
        as we sent 'accept-encoding': 'gzip, deflate' header
      */
    response = response.pipe(zlib.createUnzip());
    response.setEncoding('utf8');
    response.on('data', (chunk) => {
      responseData = responseData + chunk; /* eslint operator-assignment: 0 */
    });
    response.on('end', () => {
      resolve(responseData);
    });
    response.on('error', (err) => {
      reject(err);
    });
  });

  request.setHeader('content-length', Buffer.byteLength(records));
  request.end(records);
});

const bulk = async (records) => {
  const mappedRecords = mapRecordsToElasticSearchBulk(records);
  const zippedRecords = await gzipP(mappedRecords, 'utf-8');
  const response = await makeRequest(zippedRecords);
  return response;
};

bulk(bulkData).then(data => log(JSON.stringify(data)));
