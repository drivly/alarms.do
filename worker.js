export default {
  fetch: (req, env) => {
    // get durable object
    const { hostname, pathname } = new URL(req.url)
    const name = hostname + pathname.split('/')[1]
    const id = env.ALARM.idFromName(name)
    const stub = env.ALARM.get(id)

    // call fetch from durable object
    return stub.fetch(req)
  },
}

const SECONDS = 1000;

export class Alarm {
  constructor(state, env) {
    this.state = state
    this.storage = state.storage
    this.state.blockConcurrencyWhile(async () => {
      this.callback = await this.state.storage.get('callback')
      this.due = await this.state.storage.get('due')
    })
  }
  async fetch(request) {
    const { pathname, searchParams } = new URL(req.url)

    // If there is no alarm currently set, set one for 10 seconds from now
    let currentAlarm = await this.storage.getAlarm()
    if (currentAlarm == null) {
      this.storage.setAlarm(this.due = parseInt(searchParams.get('due')) || Date.now() + 10 * SECONDS)
      await this.state.storage.set('due', this.due)
    }

    if (this.callback == null && searchParams.has('callback')) {
      await this.state.storage.set('callback', this.callback = searchParams.get('callback'))
    }

    const retval = {
      key: pathname.split('/')[1],
      callback: this.callback,
      due: this.due
    }

    return new Response(JSON.stringify(retval), {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    });
  }

  alarm() {
    return fetch(this.callback)
  }
}
