import {ContentType} from './content-type'
import {KunaiError, ParseError} from '../error'
import {CPPCode} from '../parser/cpp'


let Marked = require('marked')
const MarkedOpts = {
  gfm: true,
  tables: true,
}


class GHSource {
  constructor(log, url, cb) {
    url = new URL(url)

    this.log = log.make_context(this.constructor.name)
    this.log.info(`got source: ${url}`, url)

    if (url.protocol != 'https:') {
      this.log.warn('protocol was not https, force setting to https', url.protocol)
      url.protocol = 'https:'
    }

    this.original_url = new URL(url)
    this.log.info(`original_url: ${this.original_url}`, this.original_url)

    this.filename = [...url.pathname.split('/')].pop()

    url.host = 'raw.githubusercontent.com'
    url.pathname = url.pathname.replace(/^\/cpprefjp\/site\/edit\//, '/cpprefjp/site/')

    this.raw_url = new URL(url)
    this.log.info(`raw_url: ${this.raw_url}`, this.raw_url)

    this.content_type = ContentType.parse(this.raw_url)
    this.fetch(cb)
  }

  fetch(cb) {
    console.time(JSON.stringify({fetch: this.filename}))

    $.ajax({
      method: 'GET',
      url: this.raw_url,
    }).done((data) => {
      console.timeEnd(JSON.stringify({fetch: this.filename}))
      this.log.info('fetch success', data)

      console.time(JSON.stringify({parse: this.filename}))

      try {
        this.parse(this.content_type, data)
        cb(this)

      } catch (e) {
        if (e instanceof KunaiError) {
          this.log.error(e.reason, ...e.args)
        } else {
          this.log.error(e.name, e.message)
        }

      } finally {
        console.timeEnd(JSON.stringify({parse: this.filename}))
      }

    }).fail(e => {
      console.timeEnd(JSON.stringify({fetch: this.filename}))
      this.log.error(e.name, e.message)
    })
  }

  parse(content_type, data) {
    this.log.info(`parsing markdown file ${this.filename}`)

    this.parse_impl(content_type, data)
    this.log.info('parse success')
  }

  parse_impl(content_type, data) {
    if (content_type === ContentType.MARKDOWN) {
      let lexer = new Marked.Lexer(MarkedOpts)
      this.log.debug('lexer', lexer)

      this.tokens = lexer.lex(data).map(e => {
        return new Map(Object.entries(e))
      })
      this.log.debug(`markdown (${this.tokens.length} tokens)`, this.tokens)

      this.process(this.tokens)
    }
  }

  process(tokens) {
    this.is_first_list = true
    this.single_bufs = []
    this.metas = new Map
    this.codes = []

    for (const token of tokens) {
      this.process_single(token)
    }
  }

  process_single(token) {
    this.log.debug(`processing token <${token.get('type')}>`, token)


    switch (token.get('type')) {
      case 'list_item_start': {
        this.single_bufs.push('')
        break
      }

      case 'list_item_end': {
        const final_buf = this.single_bufs.pop()

        if (this.is_first_list) {
          const match = final_buf.match(/([^\]]+)\[([^\] ]+) ([^\]]+)\]$/)
          this.log.debug(`matched: '${match[0]}'`, final_buf, match)

          const [_, target, k, v] = match
          this.log.debug(`matched (detailed): ${target} ${k} ${v}`, target, k, v)

          if (k === 'meta') {
            this.metas.set(v, target)
            this.log.info(`got meta: '${v}' --> '${target}'`)
          }
        }
        break
      }

      case 'list_end': {
        this.is_first_list = false
        break
      }

      case 'text': {
        if (this.is_first_list) {
          this.single_bufs[this.single_bufs.length - 1] += token.get('text')
        }
        break
      }

      case 'code': {
        const lang = token.get('lang')
        const code = token.get('text')

        if (lang === 'cpp') {
          this.log.info(`got C++ code (${this.codes.length + 1})`, code)

          const headers = [this.metas.get('header')]
          this.codes.push(new CPPCode(
            this.log,
            code,
            {
              headers: headers,
            },
          ))

        } else {
          this.log.warn(`got code for unknown language '${lang}', skipping...`, code)
        }
        break
      }
    }
  }
}

export {GHSource}
