Manual smoke (run against a local stack):

    node --input-type=module -e "
    import('./dist/index.js').then(async (sdk) => {
      sdk.configure({ baseUrl: 'http://localhost:8000' })
      const email = 'sdk-' + Date.now() + '@example.com'
      await sdk.v1RegisterCreate({ email, password: 'Sup3rSecret!pass', confirm_password: 'Sup3rSecret!pass' })
      const tokens = await sdk.tokenCreate({ email, password: 'Sup3rSecret!pass' })
      sdk.configure({ baseUrl: 'http://localhost:8000', getAccessToken: () => tokens.access })
      const me = await sdk.v1MeRetrieve()
      console.log('SDK OK as', me.email)
    })
    "
