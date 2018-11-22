var express = require('express'), app = express()
var favicon = require('serve-favicon')
var path = require('path')
var fs = require("fs")
var server = app.listen(3001,function(){
	console.log("Started...")
})



var io = require('socket.io').listen(server)
var camera = io.of('/camera')
var controllori = io.of('/controllori')
var data = new Array()
var cookieParser = require('cookie-parser')
var cookieEncrypter = require('cookie-encrypter')
var secretKey = 'eg678328hgvfg8'
var moment = require('moment')


var nameFile = "info.json"
var contents = fs.readFileSync(nameFile)
var jsonContent = JSON.parse(contents)
var http = require('http')
var mysql = require('mysql')
var bodyParser = require('body-parser')
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();
var databaseInfo = {
	host : "localhost",
	user : "thesmartbuoy",
	password : "x0rb4UnkiaAYij3y",
	database : "thesmartbuoy"
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
	extended : true
}))
app.use(cookieParser(secretKey))
app.use(cookieEncrypter(secretKey))
app.use(express.static('public'))
app.use(favicon(__dirname + '/public/favicon.ico'));
app.set('views', __dirname + '/views')
app.engine('html', require('ejs').renderFile)

io.sockets.on('connection', function(socket) {
	socket.on('camera', function(data) {
		console.log("Ricevuto messaggio su camera:" , data)
	});
	socket.emit("camera", "Benvenuto");
});



/*camera.on('camera', function(msg){
    console.log('Messaggio: ' + msg);
});
camera.on('connection', function(socket){
  console.log('Entrato in camera');
  socket.join('camera');
}); */

function createMysqlConnection() {
	return mysql.createConnection({
		host     : databaseInfo.host,
		user     : databaseInfo.user,
		password : databaseInfo.password,
		database : databaseInfo.database
	})
}

var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
	    user: 'itt2v@iisvittorioveneto.it',
	    pass: 'itt2v2016'
	}
});

app.get('/', function(req, res){
	if(typeof req.cookies.user != 'undefined') {
		var count,lastTenReports
		var connection = createMysqlConnection();
		connection.connect(function(err){
			if(err){
				res.send("Non riesco a connettermi al database!")
				res.end()
			}else{
				connection.query('SELECT COUNT(*) AS count FROM report', function(err, rows, fields) {
					count = rows[0].count
					var strQuery = 'SELECT * FROM (SELECT * FROM report ORDER BY date DESC LIMIT 10) sub ORDER BY date ASC';
					connection.query(strQuery, function(err, rows, fields) {
						connection.end()
						lastTenReports = rows
						var contents = fs.readFileSync(nameFile)
						var jsonContent = JSON.parse(contents)
						var position = '' + lastTenReports[lastTenReports.length-1].latitud + ',' + lastTenReports[lastTenReports.length-1].longitud;
						var ora = moment(lastTenReports[lastTenReports.length-1].date).locale('it') .format('LLL');
						res.render('index.ejs',{
							numeroSensori : jsonContent.esp.length,
							numeroReports : count,
							lastTenReports : lastTenReports,
							email : jsonContent.email.length,
							position: position,
							user : req.cookies.user,
							data : lastTenReports[lastTenReports.length-1],
							ora : ora
						})
					})
				})
			}
		});
	}
	else {
		res.redirect('/login');
	}
})

/* app.get('/camera', function(req, res){
	io.of('/camera').emit('camera', "ciaoooo");
	res.end()
}); */

app.get('/settings',function(req, res){
	if(typeof req.cookies.user != 'undefined') {
		var contents = fs.readFileSync(nameFile)
		var jsonContent = JSON.parse(contents)
		res.render('settings.ejs',{
			espAttuali :  jsonContent
		});
	}
	else {
		res.redirect('/login');
	}
	
})

app.get('/login',function(req, res){
	if(typeof req.cookies.user != 'undefined') {
		res.redirect('/');
	}
	else {
		res.render('login.ejs',{
			errorLogin: ""
		});
	}
	
})

/*app.get('/graphs',function(req, res) {

	if(typeof req.cookies.user != 'undefined') {
		var lastYearReports;
		var connection = createMysqlConnection();
		connection.connect(function(err){
			if(err){
				res.send("Non riesco a connettermi al database!")
				res.end()
			}else{
				var strQuery = 'SELECT * FROM report WHERE date > DATE_SUB(NOW(),INTERVAL 1 YEAR)';
				connection.query(strQuery, function(err, rows, fields) {
					connection.end()
					lastYearReports = rows
					var contents = fs.readFileSync(nameFile)
					var jsonContent = JSON.parse(contents)
					res.render('graphs.ejs',{
						user : req.cookies.user,
						lastYearReports: lastYearReports
					})
				})
				
			}
		});
		
	}
	else {
		res.render('login.ejs',{
			errorLogin: ""
		});
	}
})*/

app.get('/graphs', function(req, res) {
	if(typeof req.cookies.user != 'undefined') {
		var connection = createMysqlConnection();
		connection.connect(function(err) {
			if(err) {
				res.send("Non riesco a connettermi al database!")
				res.end();
			}
		})
		var strSubtract;
		var reports;
		switch(req.query.type) {
			case('daily'):
				strSubtract = 'DAY';
				strPage = "giornaliero";
				break;
			case('weekly'):
				strSubtract = 'WEEK';
				strPage = "settimanale"
				break;
			case('monthly'):
				strSubtract = 'MONTH';
				strPage = "mensile";
				break;
			case('yearly'):
				strSubtract = 'YEAR';
				strPage = "annuale";
				break;
			default:
				res.redirect('/404');
		}
		var arrayDati = ["temperatura dell'acqua", "temperatura esterna", "umidità", "velocità dell'acqua", "conducibilità dell'acqua", "profondità dell'acqua", "pH dell'acqua", "ossigeno disciolto", "batteria della boa", "polveri sottili"];
		var arrayDatiTipo = ["tempAcqua", "tempEst", "umid", "velAcqua", "condAcqua", "pressAcqua", "ph", "ossigeno", "batt", "pm10"];
		
		var strQuery = 'SELECT * from report WHERE date > DATE_SUB(NOW(), INTERVAL 1 ' + strSubtract + ')';
		connection.query(strQuery, function(err, rows, fields) {
			connection.end()
			reports = rows
			res.render('graphs.ejs',{
				user : req.cookies.user,
				reports: reports,
				type : req.query.type,
				arrayDati : arrayDati,
				strPage : strPage,
				arrayDatiTipo : arrayDatiTipo
			})
		})
	}
	else {
		res.redirect('/login');
	}
})

app.post('/login', function(req, res) {
	var connection = createMysqlConnection();
		connection.connect(function(err){
			if(err){
				res.send("Non riesco a connettermi al database!")
				res.end()
			}else{
				var str = "SELECT COUNT(*) AS count FROM users WHERE username = '" + req.body.email + "' AND password = sha2('" + req.body.password + "', 512)";
				connection.query(str, function(err, rows, fields) {
					if(rows[0].count == 1) {
						if(typeof req.body.remember != 'undefined') {
							res.cookie('user', req.body.email, {domain: '.laboaintelligente.it:3001', maxAge: 60*60*24*7*1000, httpOnly: true});
							res.redirect('/');
						}
						else {
							res.cookie('user', req.body.email);
							res.redirect('/');
						}
					}
					else {
						res.render('login.ejs', {
							errorLogin : 'Username o password errati!'
						});
					}
				})
			}
		});
	
})

app.post('/add-esp', function(req, res){
	var contents = fs.readFileSync(nameFile)
	var jsonContent = JSON.parse(contents)
	var nuovoEsp = {
		ip : req.body.ip,
		locazione : req.body.area
	}
	jsonContent['esp'].push(nuovoEsp)
	fs.writeFile(nameFile, JSON.stringify(jsonContent), function(err) {
		if(err) {
			return console.log(err)
		}
	})
	res.end();
})

app.post('/add-email', function(req, res){
	var contents = fs.readFileSync(nameFile)
	var jsonContent = JSON.parse(contents)
	var nuovaEmail = {
		email : req.body.email
	}
	jsonContent['email'].push(nuovaEmail)
	fs.writeFile(nameFile, JSON.stringify(jsonContent), function(err) {
		if(err) {
			return console.log(err)
		}
	})
	res.end();
})

app.get('/tables', function (req, res){
	if(typeof req.cookies.user != 'undefined') {
		var connection = createMysqlConnection();
		connection.connect()
		connection.query('SELECT * from report ORDER BY report.id DESC', function(err, rows, fields) {
			if(!err){
				connection.end()
				res.render('tables.ejs', {
				user : req.cookies.user,
				reports : rows
			})
			}else{
				res.send("Non riesco a connettermi al database!")
				res.end()
			}
		})
	}
	else {
		res.redirect('/login');
	}
	
})


app.get('/tables/:year-:month-:day', function(req, res){
	if(typeof req.cookies.user != 'undefined') {
		var connection = createMysqlConnection();
		var strDateA = "" + req.params.year + "-" + req.params.month + "-" + req.params.day + " 00:00:00";
		var strDateB = "" + req.params.year + "-" + req.params.month + "-" + req.params.day + " 23:59:59";

		var str = "SELECT * from report WHERE date BETWEEN timestamp('" + strDateA + "', 'yyyy-mm-dd hh:mi:ss') AND timestamp ('" + strDateB + "', 'yyyy-mm-dd hh:mi:ss')";
		connection.connect()
		connection.query(str, function(err, rows, fields) {
			if(!err){
				connection.end()
				res.render('tables.ejs', {
				user : req.cookies.user,
				reports : rows
			})
			}else{
				res.send("Non riesco a connettermi al database!")
				res.end()
			}
		})
	}
	else {
		res.redirect('/login');
	}
	
})

	



app.get('/send/:tempAcqua/:tempEst/:umid/:longitud/:latitud/:velAcqua/:condAcqua/:pressAcqua/:ph/:batt/:ossigeno/:pm10', function(req, res) {
	res.send("Ok")
	var event = {
		date : new Date(),
		tempAcqua : req.params.tempAcqua,
		tempEst : req.params.tempEst,
		umid : req.params.umid,
		longitud : req.params.longitud,
		latitud : req.params.latitud,
		velAcqua : req.params.velAcqua,
		condAcqua : req.params.condAcqua,
		pressAcqua : req.params.pressAcqua,
		ph : req.params.ph,
		batt : req.params.batt,
		ossigeno : req.params.ossigeno,
		pm10 : req.params.pm10
	}
	console.log(event);
	var content = fs.readFileSync("info.json");
	var jsonContent = JSON.parse(content);
	var allerta = false;
	if(parseInt(req.params.batt) < 6) {
		
		allerta = true;
	}
	if(parseInt(req.params.ph) > 9 || parseInt(req.params.ph) < 7) {
		allerta = true;
	}
	if(parseInt(req.params.condAcqua) > 400 || parseInt(req.params.condAcqua) < 300) {
		allerta = true;
	}
	if(parseInt(req.params.ossigeno) > 110 || parseInt(req.params.ossigeno) < 90) {
		allerta = true;
	}
	var diffTemp = req.params.tempEst - req.params.tempAcqua
	if(parseInt(diffTemp) > 5) {
		allerta = true;
	}
	if(parseInt(req.params.pm10) > 50) {
		allerta = true;
	}
	if(allerta) {
		for (var i = jsonContent.email.length - 1; i >= 0; i--) {
			sendMail(jsonContent.email[i].email, event);
			console.log("invio mail a " + jsonContent.email[i].email);
		}
		controllori.emit('new message', event);
		console.log("notifico event");
	}
	/* if(req.params.sensor == "humidity"){
		if(parseInt(req.params.power) > 150){
			console.log("Notifico");
			controllori.emit('new message', event)
			insert(event.date, event.sensor,event.area)
		}
	}else if(req.params.sensor == "acoustic"){
		controllori.emit('new message', event)
		insert(event.date, event.sensor,event.area)
	} */
	insert(event.tempAcqua, event.tempEst, event.umid, event.longitud, event.latitud, event.velAcqua, event.condAcqua, event.pressAcqua, event.ph, event.batt, event.ossigeno, event.pm10)
	res.end();
})

function http_request(ip){
	http.get({
		hostname: ip,
		port: 80,
		path: '/avvertito-rumore-area-5',
		agent: false
	}, (res) => {})
}

function insert(tempAcqua, tempEst, umid, longitud, latitud, velAcqua, condAcqua, pressAcqua, ph, batt, ossigeno, pm10){
	var connection = createMysqlConnection();
	connection.connect()
	connection.query("INSERT INTO `report` (`tempAcqua`, `tempEst`, `umid`, `longitud`, `latitud`, `velAcqua`, `condAcqua`, `pressAcqua`, `ph`, `batt`, `ossigeno`, `pm10`) VALUES (" + tempAcqua + ", " + tempEst + ", " + umid + ", " + longitud + ", " + latitud + ", " + velAcqua + ", " + condAcqua + ", " + pressAcqua + ", " + ph + ", " + batt + ", " + ossigeno + ", " + pm10 +")", function(err, rows, fields) {
	if (!err){
		connection.end()
	}else
		console.log('Error: ' + err)
	})
}

function sendMail(emailDaNotificare, data){
	transporter.sendMail({
		from: 'The Smart Buoy - Allerte<itt2v@iisvittorioveneto.it>',
		to: emailDaNotificare,
		subject: 'Allerta boa! ' + moment().locale('it') .format('LLL'),
		text: 'Nuova allerta dalla boa',
		html: "<h2>Nuova allerta!</h2>\n<p><b>Area:</b> " + data.longitud + ", " + data.latitud + "</p><p><b>Data e ora: </b>" + moment().locale('it') .format('LLL')+ "</p><p><b>Temperatura dell'acqua:</b> " + data.tempAcqua + "</p><p><b>Temperatura esterna:</b> " + data.tempEst + "</p><p><b>Umidità:</b> " + data.umid + "</p><p><b>Velocità dell'acqua:</b> " + data.velAcqua + "</p><p><b>Conducibilità dell'acqua:</b> " + data.condAcqua + "</p><p><b>Profondità dell'acqua:</b> " + data.pressAcqua + "</p><p><b>pH dell'acqua:</b> " + data.ph + "</p><p><b>Batteria:</b> " + data.batt + "</p><p><b>Ossigeno disciolto:</b> " + data.ossigeno + "</p><p><b>Polveri sottili:</b> " + data.pm10 + "</p>",
	}, function(err, response){
		if (err)
			console.log(err);
	});
}

app.use(function(req, res, next) {
    res.status(404);
    res.render('404.ejs');
});