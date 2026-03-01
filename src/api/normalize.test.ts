import { describe, expect, it } from 'vitest'

import { parseRunnerJob } from './normalize'

describe('parseRunnerJob', () => {
  it('accepts host integration payload with launch_method', () => {
    const parsed = parseRunnerJob({
      job_id: 'job_1',
      job_type: 'compile_captureone',
      status: 'succeeded',
      payload: {
        style_id: 'style_1',
        version: 'v1',
        execution_mode: 'host',
      },
      result: {
        artifact_id: 'artifact_1',
        sha256: 'abc123',
        download_url: '/artifacts/artifact_1',
        host_integration: {
          mode: 'host',
          launch_method: 'cli',
          captureone_app_path: '/Applications/Capture One.app',
          imported_costyle_path: '/tmp/artifact_1.costyle',
        },
      },
      error: null,
    })

    expect(parsed.result?.host_integration?.launch_method).toBe('cli')
  })

  it('rejects invalid host integration launch_method', () => {
    expect(() =>
      parseRunnerJob({
        job_id: 'job_1',
        job_type: 'compile_captureone',
        status: 'failed',
        payload: {
          style_id: 'style_1',
          version: 'v1',
          execution_mode: 'host',
        },
        result: {
          host_integration: {
            mode: 'host',
            launch_method: 'manual',
            error_code: 'APPLE_EVENT_DENIED',
            error_message: 'blocked',
          },
        },
        error: 'blocked',
      }),
    ).toThrow('Invalid runner job payload')
  })

  it('rejects invalid host integration error_code', () => {
    expect(() =>
      parseRunnerJob({
        job_id: 'job_1',
        job_type: 'compile_captureone',
        status: 'failed',
        payload: {
          style_id: 'style_1',
          version: 'v1',
          execution_mode: 'host',
        },
        result: {
          host_integration: {
            mode: 'host',
            launch_method: 'open',
            error_code: 'SOMETHING_ELSE',
            error_message: 'blocked',
          },
        },
        error: 'blocked',
      }),
    ).toThrow('Invalid runner job payload')
  })
})
