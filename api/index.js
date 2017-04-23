import express from 'express'
import path from 'path'
import bodyParser from 'body-parser'
import {
	Light,
	PowerRealtime,
	EnergyRealtime,
	Temperature,
	Room1,
	Room2,
	schedule_rule,
	energy_rule,
	notification_schedule_log,
	notification_energy_log
} from './models'

// MQTT
import mqtt from 'mqtt'
import Moment from 'moment'
import { extendMoment } from 'moment-range'

import config from './config'

const client = mqtt.connect(config.mqtt)
const moment = extendMoment(Moment)

const elec_cost = 3.9639


const app = express()
app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE')
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})

const PORT = process.env.PORT || 9090
const server = app.listen(PORT, () => {
  console.log('Production Express server API running at localhost:' + PORT)
})

const io = require('socket.io').listen(server)


io.on('connect', function(socket) {
	setInterval(() => {
		EnergyRealtime.forge().orderBy('id', 'DESC').fetchAll().then((collection) => {
			let x = [...collection.toJSON()]
			x.splice(10)
			x.sort((a, b) => (a.id - b.id))
			socket.emit('energy_room1', x)
			// socket.emit('time_server', t_s)
			// socket.emit('count', count)
		})

		PowerRealtime.forge().orderBy('id', 'DESC').fetchAll().then((collection) => {
			let y = [...collection.toJSON()]
			y.splice(10)
			y.sort((a, b) => (a.id - b.id))
			socket.emit('energy_room2', y)
		})

	},5000)
})

// io.on('connect', function(socket) {
// 	socket.emit('time_server', t_s)
// })

app.get('/data', (req, res) => {
	let { room, day } = req.query
	room = room || '202'
	day = day || '2015-02-28'
	let result = {}
	if(room == '202'){
		Room1.forge({ day: day }).fetch().then((data) => {
			if(data == null){
				res.json({})
			} else {
				result.room = data.toJSON()
				Light.forge({ room: room, day: day }).fetch().then((data2) => {
					if(data2 == null){
						res.json({})
					} else {
						result.light = data2.toJSON()
						Temperature.forge({ room: room, day: day }).fetch().then((data3) => {
							if(data3 == null){
								res.json({})
							} else {
								// console.log(data3)
								result.temperature = data3.toJSON()
								res.json(result)
							}
						})
					}
				})
			}
		})
	} else if(room == '203'){
		Room2.forge({ day: day }).fetch().then((data) => {
			if(data == null){
				res.json({})
			} else {
				result.room = data.toJSON()
				Light.forge({ room: room, day: day }).fetch().then((data2) => {
					if(data2 == null){
						res.json({})
					} else {
						result.light = data2.toJSON()
						Temperature.forge({ room: room, day: day }).fetch().then((data3) => {
							if(data3 == null){
								res.json({})
							} else {
								result.temperature = data3.toJSON()
								res.json(result)
							}
						})
					}
				})
			}
		})
	}
})


// const datatime2 = [
//       {name: '07.00', Room202: 4000, Room203: 2400, amt: 2400},
//       {name: '08.00', Room202: 3000, Room203: 1398, amt: 2210},
//       {name: '09.00', Room202: 2000, Room203: 9800, amt: 2290},
//       {name: '10.00', Room202: 2780, Room203: 3908, amt: 2000},
//       {name: '11.00', Room202: 1890, Room203: 4800, amt: 2181},
//       {name: '12.00', Room202: 2390, Room203: 3800, amt: 2500},
//       {name: '13.00', Room202: 3490, Room203: 4300, amt: 2100},
//       {name: '14.00', Room202: 4000, Room203: 2400, amt: 2400},
//       {name: '15.00', Room202: 3000, Room203: 1398, amt: 2210},
//       {name: '16.00', Room202: 2000, Room203: 9800, amt: 2290},
//       {name: '17.00', Room202: 2780, Room203: 3908, amt: 2000},
//       {name: '18.00', Room202: 1890, Room203: 4800, amt: 2181},
//       {name: '19.00', Room202: 2390, Room203: 3800, amt: 2500},
//       {name: '20.00', Room202: 3490, Room203: 4300, amt: 2100},
// ]

app.get('/energyshow', (req, res) => {
	// let { rangetime } = req.body
	// let { day } = req.body
	let day = day || '2015-02-28'
	let result = {}
	let data = {}
	Room1.forge({ day: day }).fetch().then((data1) => {
		if(data == null){
			console.log('err')
		} else {
			result.room202 = data1.toJSON()
			Room2.forge({ day: day }).fetch().then((data2) => {
				if(data == null){
					console.log('err')
				} else {
					result.room203 = data2.toJSON()
					// res.json(result)

					let r202 = { ...result.room202 }
					let r203 = { ...result.room203 }
					delete r202['room']
					delete r202['day']
					delete r202['id']
					delete r202['total']
					delete r202['created_at']
					delete r202['updated_at']
					delete r203['room']
					delete r203['day']
					delete r203['id']
					delete r203['total']
					delete r203['created_at']
					delete r203['updated_at']
					let name = Object.keys(r202)
					let valueR202 = Object.values(r202)
					let valueR203 = Object.values(r203)

					let data = name.map((value, index) => ({
						name: value,
						Room202: valueR202[index],
						Room203: valueR203[index]
					}))
					res.json(data)

				}
			})

		}
	})	
})


app.get('/notischedulelog', (req, res) => {
	notification_schedule_log.forge().orderBy('id', 'DESC').fetchAll().then((data) => {
		if(data == null){
			console.log('err')
		} else {
			let x = [...data.toJSON()]
			x.splice(5)
			x.sort((a, b) => (a.id - b.id))
			res.json(x)
		}
	})	
})

app.get('/notienergylog', (req, res) => {
	notification_energy_log.forge().orderBy('id', 'DESC').fetchAll().then((data) => {
		if(data == null){
			console.log('err')
		} else {
			let x = [...data.toJSON()]
			x.splice(5)
			x.sort((a, b) => (a.id - b.id))
			res.json(x)
		}
	})	
})

// var SerialPort = require('serialport');

// var port = new SerialPort('/dev/tty.cpj01-DevB', {
// 	parser: SerialPort.parsers.byteLength(7),
// 	baudRate: 9600
// });



// // connect to serial port 
// port.on('open', function() {
// 	// set ip for active power sensor 
// 	port.write(new Buffer('\xB4\xC0\xA8\x01\x01\x00\x1E', 'ascii'), function(err) {
//     	if (err) return console.log('Error on write: ', err.message)
//     	// time = moment().format('h:mm:ss:ms a')
//     	console.log('Set IP Success!!!');
//     	console.log('---------------------------')
//   })


// });

// function read_energy(){
// 	t_g1 = moment()
// 	count++;
// 	// console.log("count:" + count)
// 	port.write(new Buffer('\xB3\xC0\xA8\x01\x01\x00\x1D', 'ascii'))
// }

// function read_power(){
// 	port.write(new Buffer('\xB2\xC0\xA8\x01\x01\x00\x1C', 'ascii'))
// }

// function read_current(){
// 	port.write(new Buffer('\xB1\xC0\xA8\x01\x01\x00\x1B', 'ascii'))
// }

// function read_voltage(){
// 	port.write(new Buffer('\xB0\xC0\xA8\x01\x01\x00\x1A', 'ascii'))
// }

// // open errors will be emitted as an error event
// port.on('error', function(err) {
//   console.log('Error: ', err.message);
// })

// port.on('data', function (data) {
//   // console.log('Data: ' + data.toString('hex'))
//   if(data.toString('hex') == 'a40000000000a4'){
//   	setInterval(read_power, 1000)
//   	setInterval(read_current, 4000)
//   	setInterval(read_voltage, 5000)
//   	setInterval(read_energy, 10000)
//   }
//   	var str = data.toString('hex')
//   	var str_split = str.match(/.{1,2}/g)
//   	// console.log(str_split)

//   	// energy
// 	if(str_split[0] == 'a3'){ 
// 		var energy = str_split[1] + str_split[2] + str_split[3]
// 		var value_energy = parseInt(energy, 16)
// 		console.log('Count: ' + count +', energy_value: '+ value_energy + ' Wh')


// 		// console.log(new Date())
// 		//var time = new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds()
// 		// var time = moment().format('h:mm:ss:ms a')
// 		t_g2 = moment()
// 		var info = {
// 			value_energy: value_energy,
// 			T_g1: t_g1,
// 			T_g2: t_g2,
// 			count: count
// 		}
// 		client.publish('test/res10000ms', JSON.stringify(info))

// 		// EnergyRealtime.forge({
// 		// 	energy_value: value_energy
// 		// }).save()
// 	}

// 	// power
// 	if(str_split[0] == 'a2'){
// 		var power = str_split[1] + str_split[2]
// 		var value_power = parseInt(power, 16)
// 		console.log(value_power + ' W')

		
// 		EnergyRealtime.forge({
// 			energy_value: value_power
// 		}).save()

// 	}

// 	// current
// 	if(str_split[0] == 'a1'){
// 		var current1 = str_split[2]
// 		var current2 = str_split[3]
// 		var value_ctemp1 = parseInt(current1, 16)
// 		var value_ctemp2 = parseInt(current2, 16)
// 		if(value_ctemp2 < 10){
// 			value_ctemp2 = value_ctemp2/10
// 		}else if(value_ctemp2 < 100){
// 			value_ctemp2 = value_ctemp2/100
// 		}else{
// 			value_ctemp2 = value_ctemp2/1000
// 		}
// 		var value_current = value_ctemp1 + value_ctemp2
// 		console.log(value_current + ' A')

// 		var timestemp = moment().format("hh:mm:ss")

// 		// PowerRealtime.forge({
// 		// 	power_value: value_current,
// 		// 	timestemp: timestemp
// 		// }).save()
// 	}

// 	// voltage
// 	if(str_split[0] == 'a0'){
// 		var voltage1 = str_split[1] + str_split[2]
// 		var voltage2 = str_split[3]
// 		var value_vtemp1 = parseInt(voltage1, 16)
// 		var value_vtemp2 = parseInt(voltage2, 16)
// 		if(value_vtemp2 < 10){
// 			value_vtemp2 = value_vtemp2/10
// 		}else if(value_ctemp2 < 100){
// 			value_vtemp2 = value_vtemp2/100
// 		}else{
// 			value_vtemp2 = value_vtemp2/1000
// 		}
// 		var value_voltage = value_vtemp1 + value_vtemp2
// 		console.log(value_voltage + ' V')

// 	}

// });



app.get('/schedule', (req, res) => {
	schedule_rule.forge().fetchAll().then((data) => {
		if(data == null){
			res.json({})
		} else {
			res.json(data.toJSON())
		}
	})
})

app.post('/schedule', (req, res) => {
	const { room, description, day, starttime, endtime } = req.body
	// console.log("body"+req.body)
	schedule_rule.forge({ room, description, day, starttime, endtime }).save().then((schedule) => {
		res.json(schedule)
	}).catch((err) => {
		res.sendStatus(403)
	})

})

app.delete('/schedule/:id', (req, res) => {
	let { id } = req.params
	schedule_rule.forge({ id }).destroy().then((user) => {
		res.sendStatus(200)
	}).catch((err) => {
		res.sendStatus(404)
	})
})

app.patch('/schedule/:id', (req, res) => {
	let { id } = req.params
	const { room, description, day, starttime, endtime } = req.body
	schedule_rule.forge({ id }).fetch({ require: true }).then((user) => {
		user.save({ room, description, day, starttime, endtime }).then((data) => {
			res.json(data)
		}).catch((err) => {
			res.sendStatus(403)
		})
	}).catch(() => {
		res.sendStatus(404)
	})
})

app.get('/schedule/:id', (req, res) => {
	let { id } = req.params
	schedule_rule.forge({ id }).fetch().then((user) => {
		res.json(user.toJSON())
		// res.sendStatus(200)
	}).catch((err) => {
		res.sendStatus(403)
	})
})

app.get('/energyrule', (req, res) => {
	energy_rule.forge().fetchAll().then((data) => {
		if(data == null){
			res.json({})
		} else {
			res.json(data.toJSON())
		}
	})
})

app.post('/energyrule', (req, res) => {
	const { room, description, maxenergy } = req.body
	// console.log("body"+req.body)
	energy_rule.forge({ room, description, maxenergy }).save().then((schedule) => {
		res.json(schedule)
	}).catch((err) => {
		res.sendStatus(403)
	})
})

app.delete('/energyrule/:id', (req, res) => {
	let { id } = req.params
	energy_rule.forge({ id }).destroy().then((user) => {
		res.sendStatus(200)
	}).catch((err) => {
		res.sendStatus(403)
	})
})

app.patch('/energyrule/:id', (req, res) => {
	let { id } = req.params
	const { room, description, maxenergy  } = req.body
	energy_rule.forge({ id }).fetch({ require: true }).then((user) => {
		user.save({ description, maxenergy }).then((data) => {
			res.json(data)
		}).catch((err) => {
			res.sendStatus(403)
		})
	}).catch(() => {
		res.sendStatus(404)
	})
})

app.get('/energyrule/:id', (req, res) => {
	let { id } = req.params
	energy_rule.forge({ id }).fetch().then((user) => {
		res.json(user.toJSON())
		// res.sendStatus(200)
	}).catch((err) => {
		res.sendStatus(403)
	})
})

app.get('/test', (req, res) => {
	notification_schedule_log.forge().fetchAll().then((data) => {
		if(data == null){
			res.json({})
		} else {
			res.json(data.toJSON())
		}
	})
})




// PowerRealtime.forge({
// 		// 	power_value: value_current,
// 		// 	timestemp: timestemp
// 		// }).save()


// app.get('/light', (req, res) => {
// 	let { room, day } = req.query
// 	room = room || '202'
// 	day = day || '2015-02-28'
// 	Light.forge({ room: room, day: day }).fetch().then((data) => {
// 		if(data == null){
// 			res.json({})
// 		} else {
// 			res.json(data.toJSON())
// 		}
// 	})
// })

// app.get('/temperature', (req, res) => {
// 	let { room, day } = req.query
// 	room = room || '202'
// 	day = day || '2015-02-28'
// 	Temperature.forge({ room: room, day: day }).fetch().then((data) => {
// 		if(data == null){
// 			res.json({})
// 		} else {
// 			res.json(data.toJSON())
// 		}
// 	})
// })


// MQTT Important

client.on('connect', () => {
	client.subscribe('/power/#')
	// client.publish('/b', (new Date()).toString())
})
 
client.on('message', (topic, message) => {
	// message is Buffer 
  let msg = message.toString()
  let top = topic.toString()

  // console.log("Topic: " + top)
  // console.log("Message: " + msg)
  

  // Check Notificaton

  var split_top = top.split('/')
  // console.log(split_top)
  let check_noti  = JSON.parse(message)
  // console.log(check_schedule.time)
  let current = moment(check_noti.time)


  // schedule
  schedule_rule.forge().fetchAll().then((collection) => {
	  	let dataschedule = collection.toJSON()
	  	// console.log(dataschedule)
	  	let x = dataschedule.filter((data) => data.room === split_top[2] && data.day === current.format('ddd'))
	  	// console.log(x)
	  	x.map((rule) => {
	  		// console.log(rule)
	  		var startDate = rule.starttime.split('.') 
	  		// console.log(startDate)
	  		var endDate = rule.endtime.split('.') 
	  		let start = moment({ h: startDate[0], m: startDate[1] })
			let end = moment({ h: endDate[0], m: endDate[1] })
			const range = moment.range(start, end)
			
			if (range.contains(current)) {

				notification_schedule_log.forge({day: rule.day, room: rule.room, starttime: rule.starttime, endtime: rule.endtime})
				.orderBy('created_at','DESC').fetch().then((data) => {
					// console.log('notis: '+ data)
					if(data == null){
						// console.log('No log')
						notification_schedule_log.forge({
							room: rule.room,
							type: 'schedule',
							description: rule.description,
							day: rule.day,
							starttime: rule.starttime,
							endtime: rule.endtime
						}).save()
						io.emit('noti', rule)
					} else {
						// console.log('log data')
						let datalog = data.toJSON()
						let notilog_time = moment(datalog.created_at)
					  	let timeDiff = moment.duration(current - notilog_time).asMinutes();
					  	// console.log('schedule: ' + timeDiff)
					  	if(timeDiff >= 5 ) {
					  		io.emit('noti', rule)
					  		// console.log('log update')
					  		notification_schedule_log.forge({
								room: datalog.room,
								type: 'schedule',
								description: datalog.description,
								day: datalog.day,
								starttime: datalog.starttime,
								endtime: datalog.endtime
							}).save()
					  	} 
					}
				})
			}
	  	})
	})


  // energy rule 
  energy_rule.forge({room: split_top[2]}).fetch().then((collection) => {
  	let dataenergy = collection.toJSON()
  	if(dataenergy != null){
		if(check_noti.power >= dataenergy.maxenergy){
			// io.emit('noti2', dataenergy)
			notification_energy_log.forge({room: dataenergy.room}).fetch().then((data) => {
				if(data == null) {
					// console.log('save log')
					notification_energy_log.forge({
						room: dataenergy.room,
						type: 'energy',
						description: dataenergy.description,
						maxenergy: dataenergy.maxenergy
					}).save()

					io.emit('noti2', dataenergy)
				} else {
					// console.log('check time')
					let datalog = data.toJSON()
					let notilog_time = moment(datalog.updated_at)
					let timeDiff = moment.duration(current - notilog_time).asMinutes();
					// console.log('mqtt ' + current.format('MMMM Do YYYY, h:mm:ss a'))
				 //  	console.log('noti ' + notilog_time.format('MMMM Do YYYY, h:mm:ss a'))
				  	// console.log('energy: ' + timeDiff)
					if(timeDiff >= 5 ) {
				  		io.emit('noti2', dataenergy)
				  		console.log('log update')
				  		notification_energy_log.forge({room: dataenergy.room}).fetch().then((update) => {
				  			update.save()
				  		})
				  	} 
				}
			})	
		}
	}

  })

})


// email notification
// const nodemailer = require('nodemailer');
// const xoauth2 = require('xoauth2');

// var transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         xoauth2: xoauth2.createXOAuth2Generator({
// 		    user: 'kuenergy.iwing@gmail.com',
// 		    clientId: '151216395643-f8b18920h4qniufc2sbplojkig0c7jbm.apps.googleusercontent.com',
// 		    clientSecret: 'jCxiJYl0QmkGJpIg3675X5_-',
// 		    refreshToken: '1/DaQp4HNS2s2YQoJiYb4KNLNxlh9SCJMNd-s26t72UHs'
//         })
//     }
// })

// var mailOptions = {
//     from: 'Notification KUEnergy <kuenergy.iwing@gmail.com>',
//     to: 'titivorada.c@gmail.com',
//     subject: 'Email Test',
//     text: 'you have a new email. :)'
// }


// transporter.sendMail(mailOptions, function (err, res) {
//     if(err){
//         console.log('Error');
//         console.log(err)
//     } else {
//         console.log('Email Sent');
//     }
// })






