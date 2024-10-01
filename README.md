<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->
  
> Currently this project is at the 2410-Piloting Version.
> 
> Please feel free to file issues for your new feature requests and track them in the [project page](https://github.com/users/Alive24/projects/2)

## CKB-Autotrader

This repo is a generic scaffold and exemplary project for building backend and bot services for projects on CKB: you can both use it as the starter for your new project for any purposes or as a reference to learn or demonstrate how to use all kinds of CKB-related libraries, infrastructures, and to connect to other pre-existing services.

## Principles of Project

1. **Modularization**: Follows the modular design of Nest.js and make each functionality swappable and extensible based on actual needs.
2. **Demonstration**: Aims to be the best source of latest and recommended practices, tech stacks, and examples for building CKB-related services by openly invite contributions from developers of all awesome projects on CKB in the forms of available modules.
3. **Business Oriented**: For developers with actual tasks of application for business, the project should allow them to focus on the business logic and the actual needs of the project on the basis of the abstractions provided by all available modules.

## Basic Modules

- ScenarioSnapshotService
    - Balance Checking
    - UTXOSwap Pool Checking
- Schemas
    - TypeORM
- ExecuteService
    - Transfer
    - Swap
- StrategyService
    - Redistribute Tokens Across Wallets
    - Redistribute Tokens Within Wallet

## Core Concepts

- scenarioSnapshot
- action

## State-of-the-art Packages in Use

- [CCC - CKBers' Codebase](https://docs.ckbccc.com/index.html): "CCC - CKBers' Codebase" is the next step of "Common Chains Connector".
    - Empower yourself with CCC to discover the unlimited potential of CKB.
    - Interoperate with wallets from different chain ecosystems.
    - Fully enabling CKB's Turing completeness and cryptographic freedom power.

## Optional Modules

- [ ] GraphQL (WIP)
- [ ] Spore SDK (TBD)
- [ ] Fiber Network Payments (TBD)
## Installation

```bash
pnpm install
```

## Running the app

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Support

- File issue in the repo
- Telegram [@Alive24](https://t.me/Aaaaaaaalive24)

## 

## Roadmap

- [ ] GraphQL Module
- [ ] Dockerization
- [ ] Tests in CI

## License

Nest is [MIT licensed](LICENSE).
