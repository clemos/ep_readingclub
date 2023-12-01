const env = process.env;

console.log('ENV IS ', env);

module.exports = exports = {
	mongo : process.env['RC_MONGOURL'] || 'mongodb://localhost/reading_club',
	etherpad : {
		apikey : "J6XGmI42zW5qyjuKWfypYtkf84qjQ6D7",
		host: 'readingclub.fr',
  		port: 80
	},
	session : {
		secret : 'R34dIn6_CLV8'
	}
}
