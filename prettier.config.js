module.exports = {
	endOfLine: 'lf',
	jsxSingleQuote: true,
	overrides: [
		{
			files: ['*.yaml', '*.yml'],
			options: {
				singleQuote: false,
				tabWidth: 2,
				useTabs: false,
			},
		},
		{
			files: ['*.config.js', 'jest.config.js'],
			options: {
				parser: 'babel',
				useTabs: true,
				tabWidth: 2,
			},
		},
	],
	semi: false,
	singleQuote: true,
	tabWidth: 2,
	trailingComma: 'es5',
	useTabs: true,
}
