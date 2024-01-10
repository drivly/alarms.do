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
  state
  storage
  callback
  due
  every
  body
  contentType
  constructor(state) {
    this.state = state
    this.storage = state.storage
    this.state.blockConcurrencyWhile(async () => {
      this.callback = await this.state.storage.get('callback')
      this.due = await this.state.storage.get('due')
      this.every = await this.state.storage.get('every')
      this.body = await this.state.storage.get('body')
      this.contentType = await this.state.storage.get('contentType')
    })
  }
  /**
   * Increase the alarm duration.
   * @param {Request} req 
   */
  async fetch(req) {
    const { url, method, headers } = req
    const { pathname, searchParams } = new URL(url)
    let newCallback = searchParams.has('callback') && decodeURIComponent(searchParams.get('callback'))
    if (newCallback && this.callback != newCallback) {
      await this.state.storage.put('callback', this.callback = newCallback)
      if (this.body) {
        delete this.body
        await this.state.storage.delete('body')
      }
      if (this.contentType) {
        delete this.contentType
        await this.state.storage.delete('contentType')}
    }
    if (method === 'POST') {
      await this.state.storage.put('body', this.body = await req.text())
      if (headers.has('Content-Type'))
        await this.state.storage.put('contentType', this.contentType = headers.get('Content-Type'))
    }
    if (searchParams.has('every')) {
      await this.state.storage.put('every', this.every = parseInt(searchParams.get('every')))
    }
    let currentAlarm = await this.storage.getAlarm()
    if (currentAlarm == null || Date.now() <= this.due) {
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
        await this.state.storage.put('due', this.due = Date.now() + (value * multiplier))
      } else {
        // If there is no alarm, set one for 10 seconds from now
        await this.state.storage.put('due', this.due = parseInt(searchParams.get('due')) || Date.now() + 10000)
      }
      await this.storage.setAlarm(this.due)
    }

    return new Response(JSON.stringify({
      key: pathname.split('/')[1],
      callback: this.callback,
      method: this.body ? 'POST': 'GET',
      body: this.body,
      contentType: this.contentType,
      due: this.due,
      every: this.every || undefined,
    }), {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    })
  }

  async alarm() {
    if (this.every > 0) {
      await this.storage.setAlarm((this.due = Date.now() + this.every))
      await this.state.storage.put('due', this.due)
    }
    const init = {
      method: this.body ? 'POST' : 'GET',
      body: this.body,
      headers: this.contentType ? { 'Content-Type': this.contentType } : undefined,
    }
    console.log(this.callback, init)
    let res = await fetch(this.callback, init)
    const text = await res.text()
    console.log(text)
  }
}
