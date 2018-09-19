const zlib = require('zlib');
/*  https://github.com/elastic/elasticsearch-js/issues/699
    elasticsearch-js doesn't support sending buffer to escluster as of now
    this elasticsearch is modified to support sending buffer, look into package.json
 */
const elasticsearch = require('elasticsearch');
const { promisify } = require('util');
const { log } = console;

/* Index in Elasticsearch cluster in which the documents will be indexed */
const ELASTICSEARCH_INDEX = 'cloudwatch';
/* Type of the document in Elasticsearch cluster*/
const ELASTICSEARCH_TYPE = 'lambda';

/* Data to be posted */
const bulkData = require('./data.json');

const es = new elasticsearch.Client({
  host: 'localhost:9200', /* Please run a local elasticsearch cluster, default port is 9200 */
  suggestCompression: true /* To indicate elasticsearch cluster that client support gzip compression */
});

const bulkP = promisify(es.bulk.bind(es));
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

const bulk = async (records) => {
  const mappedRecords = mapRecordsToElasticSearchBulk(records);
  const zippedRecords = await gzipP(mappedRecords, 'utf-8');

  const response = await bulkP({
    body: zippedRecords,
    headers: {
      'accept-encoding': 'gzip, deflate',
      'content-type': 'application/x-ndjson',
      'content-encoding': 'gzip', /* Tell es cluster that data sent is gzipped */
      'content-length': Buffer.byteLength(zippedRecords)
    }
  });
  return response;
};

bulk(bulkData).then(data => log(JSON.stringify(data)));
