# Real devices with ContainerLab (plan)

Today every lab runs in the browser (`src/lib/sim`). The terminal only talks to the
`TerminalBackend` interface in `src/lib/sim/types.ts`:

```ts
connect(write) · input(data) · resize?(cols, rows) · onEvent(listener) · dispose()
```

That's the same shape as a PTY over a WebSocket, so real devices can sit behind it.

## Target architecture

```
browser (xterm.js) ──ws──▶ lab-gateway ──ssh/pty──▶ workstation node ──ssh──▶ sw1 (IOL / cEOS)
                               │
                               └── containerlab deploy/destroy (docker.sock, privileged)
```

| Container     | Job                                                                               | Privileges                         |
|---------------|-----------------------------------------------------------------------------------|------------------------------------|
| `web`         | This Next.js app: lessons, UI, scoring                                            | none                               |
| `lab-gateway` | Per-session `clab deploy`, WebSocket↔PTY bridge, objective checks, idle teardown  | docker.sock, privileged, host netns |
| clab nodes    | Created by containerlab per learner (`creeky-l1-<session>`)                       | managed by clab                    |

`docker-compose.yml` has a commented `lab-gateway` service under the `real-labs` profile.

## Work to do

1. **RemoteBackend** (browser): implements `TerminalBackend` over a WebSocket; `onEvent`
   receives JSON grading events on a side channel.
2. **lab-gateway**: Node (`ws` + `ssh2`) or Go. Deploys `labs/level-N/*.clab.yml` with a
   session suffix, opens a shell on the `workstation` node, streams bytes.
3. **Grading on real gear**: the gateway emits the same `LabEvent`s by checking state, not by
   parsing output: `known_hosts` on the workstation, `show users` on the switch, IOS
   `archive log config` or EOS AAA accounting for commands run, eAPI on EOS.
4. **Per-level backend**: `Level.createLab()` returns either the simulator or a RemoteBackend,
   so simulated and real levels can coexist.

## Images

- **Arista cEOS-lab**: free with an arista.com account. `docker import cEOS64-lab-<ver>.tar.xz ceos:<ver>`.
- **Cisco IOL**: comes with a Cisco Modeling Labs license; build it with vrnetlab. Containerlab's
  `cisco_iol` kind reserves `Ethernet0/0` for management, so the sim already uses `Ethernet0/1`
  for the workstation link.

Neither image can be committed to this repo; load them on the lab host.
Capacity is roughly 1 GB RAM per cEOS node; IOL is much lighter. Check this on your own host.
