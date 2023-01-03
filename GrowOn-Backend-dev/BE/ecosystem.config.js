module.exports = {
	apps: [
		{
			name: 'BE',
			script: './index.js',
			instances: 2,
			instance_var: 'INSTANCE_ID',
			exec_mode: 'cluster',
		},
	],
};
