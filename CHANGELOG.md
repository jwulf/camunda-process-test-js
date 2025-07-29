# [1.10.0](https://github.com/jwulf/camunda-process-test-js/compare/v1.9.0...v1.10.0) (2025-07-29)


### Features

* add auto-generated API documentation ([2c50c8c](https://github.com/jwulf/camunda-process-test-js/commit/2c50c8c062b14f930d8a66353197f1c9ba9fc002))

# [1.9.0](https://github.com/jwulf/camunda-process-test-js/compare/v1.8.0...v1.9.0) (2025-07-29)


### Features

* track and optionally delete deployed resources ([768eaf8](https://github.com/jwulf/camunda-process-test-js/commit/768eaf878f58722d8812f54fe411aca18c15d88c))

# [1.8.0](https://github.com/jwulf/camunda-process-test-js/compare/v1.7.0...v1.8.0) (2025-07-28)


### Features

* expose runtimeMode via test context ([93b2fe0](https://github.com/jwulf/camunda-process-test-js/commit/93b2fe02f17a7b9d118011bee6f2a9ef5f9ec6db))

# [1.7.0](https://github.com/jwulf/camunda-process-test-js/compare/v1.6.0...v1.7.0) (2025-07-28)


### Features

* add scaffolding command. fixes [#21](https://github.com/jwulf/camunda-process-test-js/issues/21) ([77b878d](https://github.com/jwulf/camunda-process-test-js/commit/77b878d047c021f190ad23ff6b30d4e5c8c7c42d))

# [1.6.0](https://github.com/jwulf/camunda-process-test-js/compare/v1.5.0...v1.6.0) (2025-07-27)


### Features

* warn on REMOTE clock manipulation. fixes [#17](https://github.com/jwulf/camunda-process-test-js/issues/17) ([368b422](https://github.com/jwulf/camunda-process-test-js/commit/368b422c544b026f43228271fd2c0b3836c9a28e))

# [1.5.0](https://github.com/jwulf/camunda-process-test-js/compare/v1.4.0...v1.5.0) (2025-07-26)


### Features

* implement flush processes in REMOTE mode. fixes [#18](https://github.com/jwulf/camunda-process-test-js/issues/18) ([05aae1f](https://github.com/jwulf/camunda-process-test-js/commit/05aae1f52b7182a8df369dd2710eea72900d84d3))

# [1.4.0](https://github.com/jwulf/camunda-process-test-js/compare/v1.3.0...v1.4.0) (2025-07-25)


### Features

* support Zeebe gRPC API. fixes [#15](https://github.com/jwulf/camunda-process-test-js/issues/15) ([9c6ad58](https://github.com/jwulf/camunda-process-test-js/commit/9c6ad583ddedb27c6f1ded8321ef90d8e1df3c92))

# [1.3.0](https://github.com/jwulf/camunda-process-test-js/compare/v1.2.1...v1.3.0) (2025-07-24)


### Features

* allow config file to specified via env. Fixes [#13](https://github.com/jwulf/camunda-process-test-js/issues/13) ([9a3e7d0](https://github.com/jwulf/camunda-process-test-js/commit/9a3e7d0231f020ace72f646efa9b7a05db0f62f2))

## [1.2.1](https://github.com/jwulf/camunda-process-test-js/compare/v1.2.0...v1.2.1) (2025-07-24)


### Bug Fixes

* remove Jest timeout detection. fixes [#11](https://github.com/jwulf/camunda-process-test-js/issues/11) ([f808e9c](https://github.com/jwulf/camunda-process-test-js/commit/f808e9ce54179fee152b5eacf12f4c1917845899))

# [1.2.0](https://github.com/jwulf/camunda-process-test-js/compare/v1.1.2...v1.2.0) (2025-07-24)


### Features

* detect and set jest timeout if it is insufficient. fixes [#9](https://github.com/jwulf/camunda-process-test-js/issues/9) ([c6487bd](https://github.com/jwulf/camunda-process-test-js/commit/c6487bd23574292db3c88eb4bb25bd47edabcd02))

## [1.1.2](https://github.com/jwulf/camunda-process-test-js/compare/v1.1.1...v1.1.2) (2025-07-24)


### Bug Fixes

* fix install command in README ([24cb115](https://github.com/jwulf/camunda-process-test-js/commit/24cb1157d41ffa6a2cab3985601c8bc00e728610))
* update semantic release config ([7de4432](https://github.com/jwulf/camunda-process-test-js/commit/7de4432225388430ee295619519e21cac5ebd091))

## [1.1.1](https://github.com/jwulf/camunda-process-test-js/compare/v1.1.0...v1.1.1) (2025-07-24)


### Bug Fixes

* correct package entry point ([17b733d](https://github.com/jwulf/camunda-process-test-js/commit/17b733de44fd187883be72ab9e5b1fb4479b2495))

# [1.1.0](https://github.com/jwulf/camunda-process-test-js/compare/v1.0.1...v1.1.0) (2025-07-24)


### Features

* implement remote engine support. fixes [#1](https://github.com/jwulf/camunda-process-test-js/issues/1) ([155b10b](https://github.com/jwulf/camunda-process-test-js/commit/155b10b74bf5475c25b054ec1d188293386fba07))

## [1.0.1](https://github.com/jwulf/camunda-process-test-js/compare/v1.0.0...v1.0.1) (2025-07-23)


### Bug Fixes

* update debugging information ([7da1d56](https://github.com/jwulf/camunda-process-test-js/commit/7da1d56275eff504bbaef149aae1b4c981fcb5f0))

# 1.0.0 (2025-07-23)


### Bug Fixes

* decisionAssertions now work ([982c540](https://github.com/jwulf/camunda-process-test-js/commit/982c5408d97b588245aaa892d05005e7384507eb))
* use actual CAMUNDA_LOG_LEVEL for client log level ([fdf9ff1](https://github.com/jwulf/camunda-process-test-js/commit/fdf9ff17947c064cf8f06930108e11da804c144f))


### Features

* Containers start, tests run ([350d981](https://github.com/jwulf/camunda-process-test-js/commit/350d981a6058466649133564a7f6dd39a4ad0bdf))
* implement DecisionAssert ([cbc6117](https://github.com/jwulf/camunda-process-test-js/commit/cbc61175294a0ea687241dca37427f285dff5151))
* implement UserTaskAssertion and clock modification ([3418e90](https://github.com/jwulf/camunda-process-test-js/commit/3418e9057732fd36a934a9f6cf0e68fbe02cb55d))
* working process assertions ([fd6dc76](https://github.com/jwulf/camunda-process-test-js/commit/fd6dc760c42a60a55e07e3cf0263910ba15e4c24))
