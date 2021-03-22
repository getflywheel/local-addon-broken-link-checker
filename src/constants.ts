const SCAN_USER_AGENT = Object.freeze({
	DEFAULT: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36"
});

const TABLE_HEADERS = {
	STATUS : {
		KEY: 'statusCode',
		TEXT: 'Status',
	},
	ORIGIN_URL: {
		KEY:'originURL',
		TEXT: 'Origin URL'
	},
	ORIGIN_URI: {
		KEY:'originURI',
		TEXT: 'Origin URI'
	},
	LINK_URL: {
		KEY: 'linkURL',
		TEXT: 'Link URL'
	},
	LINK_TEXT: {
		KEY: 'linkText',
		TEXT: 'Link Text',
	},
	FILL: {
		KEY: 'fill',
		TEXT: ''
	}
}

module.exports = {
	SCAN_USER_AGENT,
	TABLE_HEADERS,
}
