# ERPNext Setup: Permanent API Token for CherryCRM

The mobile app now uses **token authentication** (`Authorization: token api_key:api_secret`)
as its primary auth method. Tokens **never expire** — the user stays logged in until
they press Logout in the app.

The app calls `sfa_crm.api.get_api_token` right after a successful login to obtain
the user's token. You need to add this small whitelisted method to your `sfa_crm`
custom app on the ERPNext server.

> **The app works even without this.** If the endpoint is missing, the app
> automatically falls back to *silent re-login* (credentials stored encrypted in the
> device Keystore, re-login happens invisibly in the background when the session
> expires). Adding the endpoint is still recommended — token auth is stateless,
> survives password-independent session wipes, and is the standard way mobile apps
> talk to ERPNext.

## 1. Add this to `sfa_crm/api.py`

```python
import frappe
from frappe.utils.password import get_decrypted_password


@frappe.whitelist()
def get_api_token():
    """Return (creating if necessary) the logged-in user's permanent API token.

    Called by the CherryCRM mobile app immediately after login, while the
    fresh sid session is still valid. The returned "key:secret" pair is then
    used as `Authorization: token key:secret` on every subsequent request,
    so the mobile session never expires.
    """
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw("Not permitted", frappe.AuthenticationError)

    user_doc = frappe.get_doc("User", user)

    # Ensure an api_key exists
    api_key = user_doc.api_key
    if not api_key:
        api_key = frappe.generate_hash(length=15)
        user_doc.api_key = api_key

    # Reuse the existing api_secret if present, otherwise generate one.
    api_secret = None
    if user_doc.get("api_secret"):
        api_secret = get_decrypted_password("User", user, "api_secret",
                                            raise_exception=False)
    if not api_secret:
        api_secret = frappe.generate_hash(length=15)
        user_doc.api_secret = api_secret

    user_doc.flags.ignore_permissions = True
    user_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"token": f"{api_key}:{api_secret}"}
```

## 2. Restart bench

```bash
bench --site your-site-name clear-cache
bench restart
```

## 3. Verify

Log in with the mobile app and watch the app logs — you should see:

```
[TOKEN]: Permanent API token acquired and stored securely.
```

Or test manually (replace sid with a valid session cookie):

```bash
curl -X POST "http://server.royal.co.tz:8092/api/method/sfa_crm.api.get_api_token" \
     -H "Cookie: sid=YOUR_VALID_SID"
```

Expected response:

```json
{"message": {"token": "a1b2c3d4e5f6g7h:z9y8x7w6v5u4t3s"}}
```

## Notes

- **Revoking access for a user:** open the User in ERPNext and regenerate their
  API secret (or clear `api_key`/`api_secret`). The app will detect the rejected
  token, discard it, silently re-login once, and fetch the new token. To block the
  user completely, disable the User record.
- **Security:** the token is stored on the device with `expo-secure-store`
  (Android Keystore / iOS Keychain), not in plain AsyncStorage.
- The fallback credentials (for silent re-login) are also stored encrypted via
  `expo-secure-store` and are wiped when the user presses Logout.
