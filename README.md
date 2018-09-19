# elasticsearch-js-bulk-gzip-data-example

Trying to stream logs from Amazon Kinesis to Elasticsearch cluster with huge amount of data results in error as below,

```
{
  "statusCode":413,
  "response": {
    "Message": "Request size exceeded 10485760 bytes"
  }
}
```

Compressing the data would be the obvious answer. Elasticsearch supports http compression, and can be turned on in the `config/elasticsearch.yml` file by adding `http.compression: true`.

`elasticsearch-js` [doesn't support sending buffers](https://github.com/elastic/elasticsearch-js/issues/699) to elasticsearch at the moment. So I have [modified the library](https://github.com/ashwinaggarwal/elasticsearch-js/tree/topic/bulk-gzip-support) to allow sending buffers. Please use that one, until elasticsearch-js adds resolves the issue.

Most of the code is self explanatory in `index.js`. Please do not forget the headers.
