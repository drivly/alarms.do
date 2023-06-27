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

    // If there is no alarm, set one for 10 seconds from now
    let currentAlarm = await this.storage.getAlarm()
    if (currentAlarm == null) {
      await this.storage.setAlarm(this.due = parseInt(searchParams.get('due')) || Date.now() + 10000)
      await this.state.storage.put('due', this.due)
    }

    if (searchParams.has('callback')) {
      await this.state.storage.put('callback', this.callback = searchParams.get('callback'))
    }
    if (searchParams.has('fromnow')) {
      const fromNow = searchParams.get('fromnow')
      let [, value, unit] = fromNow.match(/(\d+)(\w+)/)
      const multiplier = !unit || unit.startsWith('ms') || unit.startsWith('milli') ? 1 :
        unit.startsWith('s') ? 1000 :
        unit.startsWith('m') ? 60000 :
        unit.startsWith('h') ? 3600000 :
        unit.startsWith('d') ? 86400000 :
        unit.startsWith('w') ? 604800000 :
        unit.startsWith('y') ? 31449600000 :
        1
      console.log({ value, unit, multiplier, })
      await this.state.storage.put('due', this.due = Date.now() + (value * multiplier))
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
