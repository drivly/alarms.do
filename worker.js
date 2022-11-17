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
      this.every = await this.state.storage.get('every')
    })
  }
  async fetch(req) {
    const { pathname, searchParams } = new URL(req.url)

    // If there is no alarm currently set, set one for 10 seconds from now
    let currentAlarm = await this.storage.getAlarm()
    if (currentAlarm == null || Date.now() >= this.due) {
      await this.storage.setAlarm(this.due = parseInt(searchParams.get('due')) || Date.now() + 10 * SECONDS)
      await this.state.storage.put('due', this.due)
    }

    if (searchParams.has('callback')) {
      await this.state.storage.put('callback', this.callback = searchParams.get('callback'))
    }
    if (searchParams.has('every')) {
      await this.state.storage.put('every', this.every = parseInt(searchParams.get('every')))
    }

    const retval = {
      key: pathname.split('/')[1],
      callback: this.callback,
      due: this.due,
      every: this.every || undefined,
    }

    return new Response(JSON.stringify(retval), {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    });
  }

  async alarm() {
    if (this.every){
      await this.storage.setAlarm(this.due = Date.now() + this.every)
      await this.state.storage.put('due', this.due)
    }
    return fetch(this.callback)
  }
}
