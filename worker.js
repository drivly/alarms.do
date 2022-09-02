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
  }

  // Handle HTTP requests from clients.
  async fetch(req) {
    const { origin, pathname, searchParams } = new URL(req.url)

    const retval = {
      key: pathname.split('/')[1]
    }
    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json' } })
  }
}

