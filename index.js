var http = require('http');
express = require('express');
path = require('path');
var pg = require('pg');
var app = express();
var bodyParser = require('body-parser');
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/refresh'

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('port', (process.env.PORT || 5000));

//You have parsed your request body into a JSON format
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

//default landing page
app.get('/', function (req, res) {
  res.send('<html><body><h1>Welcome to the Refresh Home Page!! :D :D :D </h1></body></html>');
});

//Getting status of idOther when your id is idYou. idYou does not have to be in the server database
//0 is unavaialable, 1 is unknown, 2 is avaialable
app.get('/db/:idOther/:idYou', function (request, response) {
  var result = 0;
  var phoneOther = request.params.idOther;
  var phoneYou = request.params.idYou;
  pg.connect(connectionString, function(err, client, done) {
        var query = client.query("select contacts, online from status where phonenumber = ($1);", [phoneOther]);
        //query.on will iterate through each row
        query.on('row', function(row) {
          console.log(row)
          var contacts = row.contacts;
          //console.log(contacts)
          var online = row.online;
          console.log(online)
          for (i = 0; i < contacts.length; i++)
            if (contacts[i] === phoneYou) 
            {
              //console.log(row);
              //console.log("The person you are searching for has you as a contact");
              //console.log("Your phone number: " + contacts[i]);
              result = online;
            }
        });
        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            return response.send(result);
        });
    });
});

//Sending a new contact to the database
//curl -X POST -H "Content-Type: application/json" --data @postTesting.json http://localhost:5000/db/phonenumberOfUser
app.post('/db/:id', function (request, response) {
  var tablename = "status";
  var phonenumber = request.params.id;
  var contacts = request.body.contacts;
  var contactString = ""
  for (i = 0; i < contacts.length - 1; i++)
    contactString += contacts[i] + " ,"
  if (contacts.length > 0) contactString += contacts[contacts.length-1]

  var online = 0;
  var insert = "insert into status (phonenumber, contacts, online ) ";
  insert += "select '" + phonenumber + "' , '{" + contactString + "}' , " + online + " "
  insert += "where not exists (select 1 from status where phonenumber = '" + phonenumber + "');"

  console.log(insert)
  var success = true; 
  pg.connect(connectionString, function(err, client, done) 
  {
    client.query(insert, function(err, result) 
    {
      done();
      if (err) {
        console.log(err); response.send("database error: "+err)
        success = false;
      }
    });
  });
  if (success)
  {
    console.log("query was a success")
    response.status(200).end();
  }
  else 
    {
      console.log("query was a failure")
      response.status(500).end();
    }
})

//Updating the status of person with phone number id
//curl -X PUT -H "Content-Type: application/json" --data @statusUpdateTesting.json http://localhost:5000/db/status/phonenumber
app.put('/db/status/:id', function (request, response) 
{
  var tablename = "status";
  var status = request.body.status;
  console.log(status)
  var phone = request.params.id;
  var update = "update status set online =  " + status + " where phonenumber = '" + phone + "';";

  //console.log(update)
  var success = true; 
  pg.connect(connectionString, function(err, client, done) 
  {
    client.query(update, function(err, result)
    {
      done();
      if (err) {
        console.log(err); response.send("Error: "+err)
        success = false;
      }
    });
  });
  if (success)
    response.status(200).end();
  else response.status(500).end();
})

//Update the contact list - bruteforce method (uploads the entire contact list again -
//hence deals with both the deletion and addition of contact, pushes responsiblity to client)
app.put('/db/contacts/:id', function (request, response) 
{
  var tablename = "status";
  var contacts = request.body.contacts;
  var phone = request.params.id;
  var contactString = ""
  //console.log(contacts);
  for (i = 0; i < contacts.length - 1; i++)
    contactString += contacts[i] + " ,"
  if (contacts.length > 0) contactString += contacts[contacts.length-1]

  var update = "update status set contacts =  '{" + contactString + "}' where phonenumber = '" + phone + "';";

  console.log(update)
  var success = true; 
  pg.connect(connectionString, function(err, client, done) 
  {
    client.query(update, function(err, result)
    {
      done();
      if (err) {
        console.log(err); response.send("Error: "+err)
        success = false;
      }
    });
  });
  if (success)
    response.status(200).end();
  else response.status(500).end();
})

//Delete user from database with phone number id
app.delete('/db/:id', function (request, response) 
{
  var tablename = "status";
  var phone = request.params.id;
  var deletion = "delete from status where phonenumber = '" + phone + "';"
  console.log(deletion);
  var success = true;
  pg.connect(connectionString, function(err, client, done) 
  {
    client.query(deletion , function(err, result)
    {
      done();
      if (err) {
        console.log(err); response.send("Error: "+err)
        success = false;
      }
    });
  });
  if (success)
    response.status(200).end();
  else response.status(500).end();
})

/*Causes the 404 page to be loaded (the Not Found error - when the 
requested content cannot be found) app.use matches all requests.
When placed at the very end, it becomes a catch-all*/
app.use(function (req,res) {
    res.render('404', {url:req.url});
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});