/**
 * 核心转换逻辑自测：npm run test:core
 * 覆盖五种协议的「链接 → Clash」与「Clash → 链接」双向往返
 */
import { load } from 'js-yaml'
import { encodeBase64, encodeBase64Url } from '../shared/base64'
import { convertUrlToClash, convertUrlToSubscription, convertYamlToProxyUrls } from '../shared/index'

let passed = 0
let failed = 0

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${label}`)
  } else {
    failed += 1
    console.error(`  ✗ ${label}`)
    if (detail !== undefined) console.error('    ', detail)
  }
}

function section(title: string): void {
  console.log(`\n== ${title} ==`)
}

// ---------------------------------------------------------------- VLESS
section('VLESS')
const vlessReality =
  'vless://892c6822-3526-46ae-9eca-19ea1b3913f3@cdn.example.com:2053?type=ws&security=reality&flow=xtls-rprx-vision&sni=cdn.example.com&fp=chrome&pbk=PUBKEY&sid=ab12&spx=%2F&path=%2Fws&host=cdn.example.com#%E9%A6%99%E6%B8%AF%E8%8A%82%E7%82%B9'
const vlessResult = convertUrlToClash(vlessReality)
console.log(vlessResult.yaml)
check('协议识别', vlessResult.protocol === 'vless')
check('备注解码', vlessResult.proxy.name === '香港节点', vlessResult.proxy.name)
check('tls 开启', vlessResult.proxy.tls === true)
check('reality-opts', JSON.stringify(vlessResult.proxy['reality-opts']) === JSON.stringify({ 'public-key': 'PUBKEY', 'short-id': 'ab12', 'spider-x': '/' }))
check('ws-opts', JSON.stringify(vlessResult.proxy['ws-opts']) === JSON.stringify({ path: '/ws', headers: { Host: 'cdn.example.com' } }))
check('文件名', vlessResult.filename === 'clash_香港节点.yaml', vlessResult.filename)

const vlessPlain = convertUrlToClash('vless://11111111-2222-3333-4444-555555555555@1.1.1.1:443?type=tcp&security=tls#node-a')
check('tcp+tls servername 回退', vlessPlain.proxy.servername === undefined)
check('无 reality 时不输出 reality-opts', vlessPlain.proxy['reality-opts'] === undefined)

// ---------------------------------------------------------------- VMess
section('VMess')
const vmessJson = {
  v: '2',
  ps: '日本节点',
  add: 'jp.example.com',
  port: '8443',
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  aid: '0',
  net: 'ws',
  type: 'none',
  host: 'jp.example.com',
  path: '/ray',
  tls: 'tls',
  sni: 'jp.example.com',
}
const vmessUrl = `vmess://${encodeBase64(JSON.stringify(vmessJson))}`
const vmessResult = convertUrlToClash(vmessUrl)
console.log(vmessResult.yaml)
check('协议识别', vmessResult.protocol === 'vmess')
check('名称', vmessResult.proxy.name === '日本节点', vmessResult.proxy.name)
check('端口', vmessResult.proxy.port === 8443)
check('ws path', (vmessResult.proxy['ws-opts'] as Record<string, unknown>)?.path === '/ray')

const vmessLikeVless = convertUrlToClash('vmess://uuid-1234@vm.example.com:443?type=grpc&security=tls&serviceName=gs&sni=vm.example.com#vm-grpc')
check('类 VLESS 写法', vmessLikeVless.proxy['grpc-opts'] !== undefined)

// ---------------------------------------------------------------- Shadowsocks
section('Shadowsocks')
const ssSip002 = `ss://${encodeBase64('aes-256-gcm:passw0rd').replace(/=+$/, '')}@ss.example.com:8388?plugin=obfs-local%3Bobfs%3Dhttp#SS%E8%8A%82%E7%82%B9`
const ssResult = convertUrlToClash(ssSip002)
console.log(ssResult.yaml)
check('cipher', ssResult.proxy.cipher === 'aes-256-gcm')
check('password', ssResult.proxy.password === 'passw0rd')
check('plugin', String(ssResult.proxy.plugin).startsWith('obfs-local'))

const ssLegacy = convertUrlToClash(`ss://${encodeBase64('chacha20-ietf-poly1305:pw123@legacy.example.com:9999')}#legacy`)
check('传统格式', ssLegacy.proxy.server === 'legacy.example.com' && ssLegacy.proxy.port === 9999, ssLegacy.proxy)

// ---------------------------------------------------------------- SSR
section('SSR')
const ssrPass = encodeBase64Url('ssr-pass')
const ssrRemarks = encodeBase64Url('SSR节点')
const ssrRaw = `1.2.3.4:8080:auth_sha1_v4:aes-256-cfb:tls1.2_ticket_auth:${ssrPass}?remarks=${ssrRemarks}&obfsparam=${encodeBase64Url('cloudflare.com')}`
const ssrUrl = `ssr://${encodeBase64Url(ssrRaw)}`
const ssrResult = convertUrlToClash(ssrUrl)
console.log(ssrResult.yaml)
check('protocol', ssrResult.proxy.protocol === 'auth_sha1_v4')
check('obfs', ssrResult.proxy.obfs === 'tls1.2_ticket_auth')
check('password 解码', ssrResult.proxy.password === 'ssr-pass')
check('remarks 解码', ssrResult.proxy.name === 'SSR节点', ssrResult.proxy.name)
check('obfs-param', ssrResult.proxy['obfs-param'] === 'cloudflare.com')

// ---------------------------------------------------------------- Trojan
section('Trojan')
const trojanResult = convertUrlToClash('trojan://my-password@tj.example.com:443?sni=tj.example.com&allowInsecure=1&alpn=h2%2Chttp%2F1.1#TJ')
console.log(trojanResult.yaml)
check('password', trojanResult.proxy.password === 'my-password')
check('skip-cert-verify', trojanResult.proxy['skip-cert-verify'] === true)
check('alpn', JSON.stringify(trojanResult.proxy.alpn) === JSON.stringify(['h2', 'http/1.1']))

// ---------------------------------------------------------------- 订阅 YAML
section('订阅格式')
const subYaml = convertUrlToSubscription(vlessReality)
console.log(subYaml)
check('仅包含 proxies', Object.keys(load(subYaml) as object).join() === 'proxies')

// ---------------------------------------------------------------- 反向：YAML → 链接
section('Clash → 代理链接')
const multiYaml = `
port: 7890
proxies:
  - name: 节点A
    type: vless
    server: a.example.com
    port: 443
    uuid: 11111111-2222-3333-4444-555555555555
    network: ws
    tls: true
    servername: a.example.com
    ws-opts:
      path: /ws
      headers:
        Host: a.example.com
  - name: 节点B
    type: trojan
    server: b.example.com
    port: 443
    password: pw
    sni: b.example.com
  - name: 节点C
    type: vmess
    server: c.example.com
    port: 8080
    uuid: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
    alterId: 0
    cipher: auto
    network: tcp
  - name: 节点D
    type: ss
    server: d.example.com
    port: 8388
    cipher: aes-128-gcm
    password: pw2
  - name: 节点E
    type: ssr
    server: e.example.com
    port: 8080
    cipher: aes-256-cfb
    password: pw3
    protocol: origin
    obfs: plain
  - name: 不支持的节点
    type: hysteria2
    server: f.example.com
    port: 443
`
const urls = convertYamlToProxyUrls(multiYaml)
for (const item of urls) console.log(`  ${item.type.padEnd(8)} ${item.url ?? `[${item.error}]`}`)
check('节点数量', urls.length === 6)
check('VLESS 链接', String(urls[0].url).startsWith('vless://11111111-2222-3333-4444-555555555555@a.example.com:443?type=ws&security=tls'))
check('Trojan 链接', String(urls[1].url).startsWith('trojan://pw@b.example.com:443?sni=b.example.com'))
check('VMess 链接可解码', String(urls[2].url).startsWith('vmess://'))
check('SS 链接', String(urls[3].url).startsWith('ss://'))
check('SSR 链接', String(urls[4].url).startsWith('ssr://'))
check('不支持协议报错', urls[5].url === null && String(urls[5].error).includes('不支持的协议'))

// 往返：YAML → 链接 → YAML
const roundTrip = convertUrlToClash(String(urls[0].url))
check('往返后名称保持', roundTrip.proxy.name === '节点A', roundTrip.proxy.name)
check('往返后 ws 参数保持', JSON.stringify(roundTrip.proxy['ws-opts']) === JSON.stringify({ path: '/ws', headers: { Host: 'a.example.com' } }))

const vmessRoundTrip = convertUrlToClash(String(urls[2].url))
check('VMess 往返 uuid', vmessRoundTrip.proxy.uuid === 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
check('VMess 往返 network', vmessRoundTrip.proxy.network === 'tcp')

// ---------------------------------------------------------------- 错误处理
section('错误处理')
const expectError = (label: string, fn: () => unknown, keyword: string): void => {
  try {
    fn()
    check(label, false, '未抛出异常')
  } catch (error) {
    const message = (error as Error).message
    check(label, message.includes(keyword), message)
  }
}
expectError('未知协议', () => convertUrlToClash('http://example.com'), '不支持的协议')
expectError('非法 VLESS', () => convertUrlToClash('vless://broken'), '主机信息')
expectError('空 YAML', () => convertYamlToProxyUrls(''), 'YAML 内容为空')
expectError('无 proxies', () => convertYamlToProxyUrls('port: 7890'), '未找到 proxies')

console.log(`\n通过 ${passed} 项，失败 ${failed} 项`)
if (failed > 0) process.exitCode = 1
