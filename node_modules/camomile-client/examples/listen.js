/*
 * An example showing the sse channel listen functionality
 */

var Camomile = require('..');

if(process.argv.length !=6) {
  console.log("Usage : node example.js <host> <user> <password> <corpus_id>");
  process.exit(1);
}

var host=process.argv[2];
var user=process.argv[3];
var password=process.argv[4];
var corpusId=process.argv[5];

var listener=function(error, data) {
  console.log(error, data);
};

var client=new Camomile(host);
client
  .login(user, password)
  .then(result =>  {
    console.log(result);
    return client.watchCorpus(corpusId, listener);
  })
  .then(() => {
      // To unwatch the corpus :

      //client.unwatchCorpus(corpusId, listener);
    })
  .catch(err => console.log(err));