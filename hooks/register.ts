// A plugin has one hooks module, and each event without a matcher is hooked once in it:
// this module hooks session.start and turn.complete for both panes, and each feature registers the rest.
import type { Register } from 'claude-code'

import { declareCockpit, endCockpitTurn, registerCockpit, startCockpit } from './cockpit'
import { endScreenBoardTurn, registerScreenBoard, startScreenBoard } from './screen-board'
import { registerStyle } from './style'

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await startCockpit($).catch(() => undefined)
    await startScreenBoard($).catch(() => undefined)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const answer = await next(e)
    if (e.agentId === undefined) {
      // The app can load this module after session.start (synced plugin, hot reload); registering again replaces.
      await declareCockpit($).catch(() => undefined)
      await startScreenBoard($).catch(() => undefined)
      await endCockpitTurn($).catch(() => undefined)
      await endScreenBoardTurn($).catch(() => undefined)
    }

    return answer
  })

  registerCockpit(on)
  registerScreenBoard(on)
  registerStyle(on, options)
}
