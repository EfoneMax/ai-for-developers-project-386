# Changelog

## [0.2.0](https://github.com/EfoneMax/ai-for-developers-project-386/compare/call-booking-v0.1.0...call-booking-v0.2.0) (2026-11-15)


### Features

* add landing page with booking stub ([e8a7517](https://github.com/EfoneMax/ai-for-developers-project-386/commit/e8a75170b18a729c543fb06cde3f3db28cf469d2))
* add shadcn ui foundation and mcp setup ([6161587](https://github.com/EfoneMax/ai-for-developers-project-386/commit/6161587d3d53f98ea56a118aaa66f94dfd7e592d))
* **api:** add booking creation and upcoming meetings endpoints ([4cd2eff](https://github.com/EfoneMax/ai-for-developers-project-386/commit/4cd2eff17a7b9208cc0d37f3c545e5afdef8dc53)), closes [#21](https://github.com/EfoneMax/ai-for-developers-project-386/issues/21)
* **api:** add meeting type creation and list endpoints ([35415de](https://github.com/EfoneMax/ai-for-developers-project-386/commit/35415dece51b5fb6dcefa9bb23c6a93cda90c967)), closes [#17](https://github.com/EfoneMax/ai-for-developers-project-386/issues/17)
* **api:** expose free slots for a meeting type ([a7a30c8](https://github.com/EfoneMax/ai-for-developers-project-386/commit/a7a30c84e1435072d90fde9015da719366c8cf3d)), closes [#18](https://github.com/EfoneMax/ai-for-developers-project-386/issues/18)
* **api:** let owners cancel upcoming bookings ([2c21d66](https://github.com/EfoneMax/ai-for-developers-project-386/commit/2c21d66cf3f198a98de94ceb7963466adb778c0a)), closes [#23](https://github.com/EfoneMax/ai-for-developers-project-386/issues/23)
* **api:** let owners edit, delete and search meeting types ([d04de17](https://github.com/EfoneMax/ai-for-developers-project-386/commit/d04de17df4006a98b266ad51b2c2f50e3b2883fc)), closes [#22](https://github.com/EfoneMax/ai-for-developers-project-386/issues/22)
* **deploy:** ship Docker image and Railway deployment ([55e6da0](https://github.com/EfoneMax/ai-for-developers-project-386/commit/55e6da006e4b82fcaee40d64dbdf5bd8e379c4f1)), closes [#27](https://github.com/EfoneMax/ai-for-developers-project-386/issues/27)
* **meeting-types:** seed default types on start ([23ffbc9](https://github.com/EfoneMax/ai-for-developers-project-386/commit/23ffbc9c51a899658de7d5c09740d6b031c14c32)), closes [#28](https://github.com/EfoneMax/ai-for-developers-project-386/issues/28)
* **web:** add day and slot selection to the booking page ([c2900f7](https://github.com/EfoneMax/ai-for-developers-project-386/commit/c2900f71fbec7d37e5795292c0bd4f2a26a08861)), closes [#18](https://github.com/EfoneMax/ai-for-developers-project-386/issues/18)
* **web:** add owner dashboard with meeting type creation ([81c2c1d](https://github.com/EfoneMax/ai-for-developers-project-386/commit/81c2c1d5486fb2f449b5567710e106221f0d6fa5)), closes [#17](https://github.com/EfoneMax/ai-for-developers-project-386/issues/17)
* **web:** cancel upcoming meetings from the owner dashboard ([b5d18e2](https://github.com/EfoneMax/ai-for-developers-project-386/commit/b5d18e2ffc954ad11facd6278502585504f649c8)), closes [#23](https://github.com/EfoneMax/ai-for-developers-project-386/issues/23)
* **web:** let guests book a slot and show upcoming meetings ([fa41d75](https://github.com/EfoneMax/ai-for-developers-project-386/commit/fa41d753d9a2ec19b4a39921dc4e0dbcea7f624a)), closes [#21](https://github.com/EfoneMax/ai-for-developers-project-386/issues/21)
* **web:** list meeting types on the booking page ([fc9508c](https://github.com/EfoneMax/ai-for-developers-project-386/commit/fc9508c93666cfca3468c1d06cc199be2103435d)), closes [#17](https://github.com/EfoneMax/ai-for-developers-project-386/issues/17)
* **web:** manage meeting types in the owner dashboard ([7a42bbc](https://github.com/EfoneMax/ai-for-developers-project-386/commit/7a42bbcd5738fc0175383db0050e86524d9d3a61)), closes [#22](https://github.com/EfoneMax/ai-for-developers-project-386/issues/22)


### Bug Fixes

* build frontend in production mode ([71b5e37](https://github.com/EfoneMax/ai-for-developers-project-386/commit/71b5e378685bb1cb2969de9c618d71edeb56ba8f))
* **repo:** ignore node_modules symlinks in worktrees ([c1bd4dd](https://github.com/EfoneMax/ai-for-developers-project-386/commit/c1bd4dde37a8d84f9c91f7c9143f3bf0b1c6de24)), closes [#16](https://github.com/EfoneMax/ai-for-developers-project-386/issues/16)
* **server:** derive the owner time zone from Europe/Moscow ([20d4963](https://github.com/EfoneMax/ai-for-developers-project-386/commit/20d49630ea5ebcf4c495e699e01f4efb2f32a973)), closes [#16](https://github.com/EfoneMax/ai-for-developers-project-386/issues/16)
* **server:** map Fastify errors to the documented codes ([42797fc](https://github.com/EfoneMax/ai-for-developers-project-386/commit/42797fc93a7bffbed5f7671b48473b2a52bc88bd)), closes [#16](https://github.com/EfoneMax/ai-for-developers-project-386/issues/16)
* **slots:** take the booking window from the server ([ee56775](https://github.com/EfoneMax/ai-for-developers-project-386/commit/ee56775569b677e5959f3bbc2b3b56f28a4e05de)), closes [#29](https://github.com/EfoneMax/ai-for-developers-project-386/issues/29)
* target shadcn workspace and harden checks ([8c0b68e](https://github.com/EfoneMax/ai-for-developers-project-386/commit/8c0b68ef7946d763b45a3e3a9d3af81c8822ac65))
* **web:** keep every slot day and return to types when the type is gone ([567efa3](https://github.com/EfoneMax/ai-for-developers-project-386/commit/567efa34cd412f92f457e79a041c72ffdc60eae4)), closes [#16](https://github.com/EfoneMax/ai-for-developers-project-386/issues/16)
* **web:** show 09:00-18:00 working hours ([95cb4da](https://github.com/EfoneMax/ai-for-developers-project-386/commit/95cb4dae5a1e7c626f3cb081feaab81c72284fcc))
