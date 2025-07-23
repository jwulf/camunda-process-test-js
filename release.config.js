// eslint-disable-next-line no-undef
module.exports = {
	branches: ['main'],
	repositoryUrl: 'https://github.com/camunda/camunda-8-js-sdk.git',
	plugins: [
		[
			'@semantic-release/commit-analyzer',
			{
				releaseRules: [
					{
						type: 'feat',
						release: 'minor',
					},
					{
						type: 'fix',
						release: 'patch',
					},
					{
						type: 'release',
						release: 'patch',
					},
					{
						type: 'minor',
						release: 'minor',
					},
				],
			},
		],

		'@semantic-release/release-notes-generator',
		'@semantic-release/changelog',
		['@semantic-release/npm', {}],
		[
			'@semantic-release/git',
			{
				assets: ['CHANGELOG.md', 'package.json'],
				message: 'chore(release): ${nextRelease.version} [skip ci]',
			},
		],
		'@semantic-release/git',
	],
}
