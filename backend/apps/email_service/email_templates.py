"""
email_templates.py — SplitMate HTML + plain-text email templates.

All templates receive arguments and return (subject, plain_text, html).
Templates follow the SplitMate dark card design system, with responsive
mobile formatting, clear information hierarchy, and primary CTAs.
"""
from django.conf import settings

# ---------------------------------------------------------------------------
# Shared layout helpers & design tokens
# ---------------------------------------------------------------------------

_INDIGO = '#6366f1'
_INDIGO_LIGHT = '#818cf8'
_BG_DARK = '#0f172a'
_BG_CARD = '#1e293b'
_BORDER = '#334155'
_TEXT = '#e2e8f0'
_MUTED = '#94a3b8'
_DIM = '#64748b'
_GREEN = '#22c55e'
_RED = '#ef4444'
_ORANGE = '#f59e0b'

_EXPIRY = getattr(settings, 'OTP_EXPIRY_MINUTES', 10)
_FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')


def _wrap_html(body: str) -> str:
    """Wrap a body fragment in the SplitMate email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SplitMate</title>
</head>
<body style="margin:0;padding:0;background:{_BG_DARK};font-family:Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:{_BG_DARK};padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:540px;background:{_BG_CARD};border:1px solid {_BORDER};
             border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.3);">
        <!-- Header -->
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid {_BORDER};background:#162032;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:22px;font-weight:700;letter-spacing:-0.5px;color:{_INDIGO_LIGHT};">SplitMate</span>
                </td>
                <td align="right">
                  <span style="font-size:12px;color:{_DIM};">Shared Expenses</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">{body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;border-top:1px solid {_BORDER};
                     text-align:center;font-size:12px;color:{_DIM};line-height:1.6;">
            SplitMate &mdash; Fast, simple expense sharing.<br>
            You can customize your notification preferences anytime in your account settings.<br>
            &copy; 2024 SplitMate. All rights reserved.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _otp_block(otp: str) -> str:
    return f"""
    <div style="background:{_BG_DARK};border:1px solid {_BORDER};border-radius:12px;
                padding:24px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:{_MUTED};letter-spacing:1px;font-weight:600;">
        YOUR VERIFICATION CODE
      </p>
      <span style="font-size:40px;font-weight:700;letter-spacing:14px;color:{_INDIGO_LIGHT};
                   font-family:monospace;">{otp}</span>
      <p style="margin:12px 0 0;font-size:12px;color:{_DIM};">
        Expires in <strong style="color:{_TEXT};">{_EXPIRY} minutes</strong>
        &nbsp;&mdash;&nbsp; do not share this code.
      </p>
    </div>"""


def _security_note() -> str:
    return f"""<p style="margin:24px 0 0;font-size:12px;color:{_DIM};
               background:{_BG_DARK};padding:12px 16px;border-radius:8px;
               border-left:3px solid {_ORANGE};">
  🔒 &nbsp;If you didn't initiate this action, secure your account or contact support immediately.
</p>"""


def _cta_button(text: str, url: str) -> str:
    if not url.startswith('http'):
        url = f"{_FRONTEND_URL.rstrip('/')}/{url.lstrip('/')}"
    return f"""
    <div style="margin:28px 0 16px;text-align:center;">
      <a href="{url}" style="background:{_INDIGO};color:#ffffff;text-decoration:none;
         padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;
         display:inline-block;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(99,102,241,0.35);">
        {text} &rarr;
      </a>
    </div>"""


def _info_table(rows: list[tuple[str, str]]) -> str:
    rows_html = "".join(
        f"""<tr>
          <td style="padding:10px 14px;color:{_MUTED};font-size:13px;border-bottom:1px solid {_BORDER};">{label}</td>
          <td style="padding:10px 14px;color:{_TEXT};font-weight:600;font-size:14px;text-align:right;border-bottom:1px solid {_BORDER};">{value}</td>
        </tr>"""
        for label, value in rows
    )
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:{_BG_DARK};border:1px solid {_BORDER};
           border-radius:12px;margin:20px 0;overflow:hidden;border-collapse:collapse;">
      {rows_html}
    </table>"""


# ---------------------------------------------------------------------------
# 1. ACCOUNT & SECURITY TEMPLATES
# ---------------------------------------------------------------------------

def email_verification(name: str, otp: str) -> tuple[str, str, str]:
    subject = "Verify your SplitMate email"
    plain = (
        f"Hi {name},\n\n"
        f"Welcome to SplitMate!\n\n"
        f"Your verification code is: {otp}\n\n"
        f"This code expires in {_EXPIRY} minutes. Do not share it.\n\n"
        f"If you didn't create a SplitMate account, ignore this email.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Verify your email address</h2>
      <p style="margin:0 0 4px;color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, welcome to SplitMate!
      </p>
      <p style="color:{_MUTED};">Use the code below to complete your registration.</p>
      {_otp_block(otp)}
      {_security_note()}
    """
    return subject, plain, _wrap_html(body)


def account_verified(name: str, action_url: str = '/') -> tuple[str, str, str]:
    subject = "Your SplitMate account is verified"
    plain = (
        f"Hi {name},\n\n"
        f"Welcome to SplitMate! Your email has been successfully verified.\n\n"
        f"SplitMate makes tracking group expenses, splitting bills, and settling balances effortless.\n\n"
        f"Next step: Create a new group or join your friends to start splitting expenses.\n\n"
        f"Go to Dashboard: {_FRONTEND_URL}\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Welcome to SplitMate! 🎉</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, your email has been successfully verified.
      </p>
      <div style="background:{_BG_DARK};border:1px solid {_GREEN}40;border-radius:12px;
                  padding:16px 20px;margin:20px 0;">
        <p style="margin:0;color:{_TEXT};font-size:14px;line-height:1.6;">
          <strong>Shared expenses made simple.</strong> Create groups for trips, roommates, or outings,
          add expenses in seconds, and let SplitMate handle the math and settlements.
        </p>
      </div>
      <p style="color:{_MUTED};font-size:14px;">
        Ready to get started? Jump straight to your dashboard:
      </p>
      {_cta_button("Go to Dashboard", action_url)}
    """
    return subject, plain, _wrap_html(body)


def password_reset(name: str, otp: str) -> tuple[str, str, str]:
    subject = "Reset your SplitMate password"
    plain = (
        f"Hi {name},\n\n"
        f"We received a request to reset your SplitMate password.\n\n"
        f"Your reset code is: {otp}\n\n"
        f"This code expires in {_EXPIRY} minutes.\n\n"
        f"If you didn't request a reset, secure your account immediately.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Reset your password</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>,
        we received a request to reset your SplitMate password.
      </p>
      {_otp_block(otp)}
      <p style="color:{_MUTED};font-size:14px;">
        If you didn't make this request, your password has not been changed.
      </p>
      {_security_note()}
    """
    return subject, plain, _wrap_html(body)


def password_changed(name: str) -> tuple[str, str, str]:
    subject = "Your SplitMate password was changed"
    plain = (
        f"Hi {name},\n\n"
        f"Your SplitMate password was successfully changed.\n\n"
        f"If you did not make this change, secure your account immediately and contact support.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Password changed</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>.
      </p>
      <div style="background:{_BG_DARK};border:1px solid {_GREEN}40;border-radius:12px;
                  padding:16px 20px;margin:20px 0;">
        <span style="color:{_GREEN};font-weight:700;">✓</span>
        <span style="color:{_TEXT};margin-left:8px;font-size:14px;">
          Your password was successfully updated.
        </span>
      </div>
      <p style="color:{_MUTED};font-size:14px;">
        All existing sessions have been invalidated for your security.
      </p>
      {_security_note()}
    """
    return subject, plain, _wrap_html(body)


def email_changed(name: str, old_email: str, new_email: str) -> tuple[str, str, str]:
    subject = "Your SplitMate email address was changed"
    plain = (
        f"Hi {name},\n\n"
        f"Your SplitMate account email has been updated.\n"
        f"Previous email: {old_email}\n"
        f"New email: {new_email}\n\n"
        f"If you did not make this change, contact support immediately.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Email address changed</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, your account email was updated:
      </p>
      {_info_table([('Previous email', old_email), ('New email', new_email)])}
      {_security_note()}
    """
    return subject, plain, _wrap_html(body)


def change_email_verification(name: str, new_email: str, otp: str) -> tuple[str, str, str]:
    subject = "Verify your new SplitMate email address"
    plain = (
        f"Hi {name},\n\n"
        f"You requested to change your SplitMate email to {new_email}.\n\n"
        f"Your verification code is: {otp}\n\n"
        f"This code expires in {_EXPIRY} minutes.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Verify new email address</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, you requested to update your email to
        <strong style="color:{_INDIGO_LIGHT};">{new_email}</strong>.
      </p>
      {_otp_block(otp)}
      {_security_note()}
    """
    return subject, plain, _wrap_html(body)


def security_alert(name: str, event: str, detail: str = '') -> tuple[str, str, str]:
    subject = "Security alert for your SplitMate account"
    plain = (
        f"Hi {name},\n\n"
        f"Security Alert: {event}\n"
        f"{detail}\n\n"
        f"If this wasn't you, secure your account immediately.\n\n"
        f"— The SplitMate Team"
    )
    detail_html = f'<p style="color:{_MUTED};font-size:14px;margin-top:10px;">{detail}</p>' if detail else ''
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_RED};">⚠ Security Alert</h2>
      <p style="color:{_MUTED};">Hi <strong style="color:{_TEXT};">{name}</strong>,</p>
      <div style="background:{_BG_DARK};border:1px solid {_RED}40;border-radius:10px;
                  padding:16px 20px;margin:20px 0;">
        <p style="margin:0;color:{_TEXT};font-size:15px;font-weight:600;">{event}</p>
        {detail_html}
      </div>
      {_security_note()}
    """
    return subject, plain, _wrap_html(body)


# ---------------------------------------------------------------------------
# 2. GROUP EVENT TEMPLATES
# ---------------------------------------------------------------------------

def added_to_group(name: str, group_name: str, added_by: str, current_balance: str = '₹0', action_url: str = '/') -> tuple[str, str, str]:
    subject = f"You've been added to {group_name}"
    plain = (
        f"Hi {name},\n\n"
        f"You've been added to {group_name} by {added_by}.\n\n"
        f"Group: {group_name}\n"
        f"Added by: {added_by}\n"
        f"Current balance: {current_balance}\n\n"
        f"View Group: {_FRONTEND_URL}\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">You've been added to a group</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, you've been added to
        <strong style="color:{_INDIGO_LIGHT};">{group_name}</strong> by {added_by}.
      </p>
      {_info_table([
          ('Group', group_name),
          ('Added by', added_by),
          ('Current balance', current_balance),
      ])}
      {_cta_button("View Group", action_url)}
    """
    return subject, plain, _wrap_html(body)


def removed_from_group(name: str, group_name: str, removed_by: str, final_balance: str = '₹0') -> tuple[str, str, str]:
    subject = f"You were removed from {group_name}"
    plain = (
        f"Hi {name},\n\n"
        f"You were removed from {group_name} by {removed_by}.\n"
        f"Final balance: {final_balance} (Settled)\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Group membership update</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, you were removed from
        <strong style="color:{_INDIGO_LIGHT};">{group_name}</strong> by {removed_by}.
      </p>
      {_info_table([
          ('Group', group_name),
          ('Removed by', removed_by),
          ('Final balance', f"{final_balance} (Settled)"),
      ])}
    """
    return subject, plain, _wrap_html(body)


def group_created(name: str, group_name: str, action_url: str = '/') -> tuple[str, str, str]:
    subject = f"Group created: {group_name}"
    plain = (
        f"Hi {name},\n\n"
        f"Your group '{group_name}' was successfully created.\n"
        f"You can now invite members and start splitting expenses.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Group created! 🚀</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, your new group
        <strong style="color:{_INDIGO_LIGHT};">{group_name}</strong> is live.
      </p>
      {_cta_button("Open Group", action_url)}
    """
    return subject, plain, _wrap_html(body)


def group_deleted(name: str, group_name: str, deleted_by: str) -> tuple[str, str, str]:
    subject = f"Group deleted: {group_name}"
    plain = (
        f"Hi {name},\n\n"
        f"The group '{group_name}' was deleted by {deleted_by}.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Group deleted</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>,
        the group <strong style="color:{_INDIGO_LIGHT};">{group_name}</strong>
        was deleted by {deleted_by}. All active activities in this group have ended.
      </p>
    """
    return subject, plain, _wrap_html(body)


def role_changed(name: str, group_name: str, new_role: str, action_url: str = '/') -> tuple[str, str, str]:
    subject = f"Your role in {group_name} was updated"
    plain = (
        f"Hi {name},\n\n"
        f"You are now the {new_role} of {group_name}.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Role updated</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, you have been designated as the
        <strong style="color:{_INDIGO_LIGHT};">{new_role}</strong> of
        <strong>{group_name}</strong>.
      </p>
      {_cta_button("View Group", action_url)}
    """
    return subject, plain, _wrap_html(body)


# ---------------------------------------------------------------------------
# 3. EXPENSE EVENT TEMPLATES
# ---------------------------------------------------------------------------

def new_expense(
    name: str,
    group_name: str,
    description: str,
    total: str,
    paid_by: str,
    your_share: str,
    resulting_balance: str,
    action_url: str = '/',
) -> tuple[str, str, str]:
    subject = f"New expense in {group_name}: {description}"
    plain = (
        f"Hi {name},\n\n"
        f"A new expense was added in {group_name}.\n\n"
        f"Group: {group_name}\n"
        f"Expense: {description}\n"
        f"Total: {total}\n"
        f"Paid by: {paid_by}\n"
        f"Your share: {your_share}\n"
        f"Your resulting balance: {resulting_balance}\n\n"
        f"View Expense: {_FRONTEND_URL}\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">New expense added</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, a new expense was recorded in
        <strong style="color:{_INDIGO_LIGHT};">{group_name}</strong>:
      </p>
      {_info_table([
          ('Group', group_name),
          ('Expense', description),
          ('Total', total),
          ('Paid by', paid_by),
          ('Your share', your_share),
          ('Resulting balance', resulting_balance),
      ])}
      {_cta_button("View Expense", action_url)}
    """
    return subject, plain, _wrap_html(body)


def expense_edited(
    name: str,
    group_name: str,
    description: str,
    prev_total: str,
    new_total: str,
    prev_share: str,
    new_share: str,
    updated_balance: str,
    action_url: str = '/',
) -> tuple[str, str, str]:
    subject = f"Expense updated: {description} in {group_name}"
    plain = (
        f"Hi {name},\n\n"
        f"The expense '{description}' in {group_name} was edited.\n\n"
        f"Previous amount: {prev_total}\n"
        f"New amount: {new_total}\n"
        f"Previous share: {prev_share}\n"
        f"New share: {new_share}\n"
        f"Updated balance: {updated_balance}\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Expense updated</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>,
        <strong style="color:{_INDIGO_LIGHT};">{description}</strong> was updated in {group_name}.
      </p>
      {_info_table([
          ('Previous amount', prev_total),
          ('New amount', new_total),
          ('Previous share', prev_share),
          ('New share', new_share),
          ('Updated balance', updated_balance),
      ])}
      {_cta_button("View Expense", action_url)}
    """
    return subject, plain, _wrap_html(body)


def expense_deleted(
    name: str,
    group_name: str,
    description: str,
    amount: str,
    resulting_balance: str = '',
) -> tuple[str, str, str]:
    subject = f"Expense deleted: {description} in {group_name}"
    plain = (
        f"Hi {name},\n\n"
        f"{description} — {amount} was deleted from {group_name}.\n"
        f"Updated balance: {resulting_balance}\n\n"
        f"— The SplitMate Team"
    )
    rows = [('Group', group_name), ('Deleted expense', f"{description} — {amount}")]
    if resulting_balance:
        rows.append(('Updated balance', resulting_balance))
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Expense deleted</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, an expense was removed from
        <strong style="color:{_INDIGO_LIGHT};">{group_name}</strong>:
      </p>
      {_info_table(rows)}
    """
    return subject, plain, _wrap_html(body)


# ---------------------------------------------------------------------------
# 4. BALANCE & SETTLEMENT EVENT TEMPLATES
# ---------------------------------------------------------------------------

def you_owe(name: str, creditor: str, amount: str, group_name: str, action_url: str = '/') -> tuple[str, str, str]:
    subject = f"You owe {creditor} {amount}"
    plain = (
        f"Hi {name},\n\n"
        f"You currently owe {creditor} {amount} in {group_name}.\n\n"
        f"View your balance in SplitMate: {_FRONTEND_URL}\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Balance update</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>,
        you currently owe <strong style="color:{_INDIGO_LIGHT};">{creditor}</strong>
        <strong style="color:{_ORANGE};">{amount}</strong> in {group_name}.
      </p>
      {_cta_button("View Balance", action_url)}
    """
    return subject, plain, _wrap_html(body)


def someone_owes_you(name: str, debtor: str, amount: str, group_name: str, action_url: str = '/') -> tuple[str, str, str]:
    subject = f"{debtor} owes you {amount} in {group_name}"
    plain = (
        f"Hi {name},\n\n"
        f"{debtor} owes you {amount} in {group_name}.\n\n"
        f"View your balance in SplitMate: {_FRONTEND_URL}\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Balance update</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>,
        <strong style="color:{_INDIGO_LIGHT};">{debtor}</strong> owes you
        <strong style="color:{_GREEN};">{amount}</strong> in {group_name}.
      </p>
      {_cta_button("View Balance", action_url)}
    """
    return subject, plain, _wrap_html(body)


def balance_settled(name: str, other_name: str, group_name: str, action_url: str = '/') -> tuple[str, str, str]:
    subject = f"You're all settled up with {other_name} for {group_name}"
    plain = (
        f"Hi {name},\n\n"
        f"You're all settled up with {other_name} for {group_name}.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">All settled up! ✨</h2>
      <div style="background:{_BG_DARK};border:1px solid {_GREEN}40;border-radius:12px;
                  padding:16px 20px;margin:20px 0;">
        <p style="margin:0;color:{_TEXT};font-size:15px;">
          ✓ &nbsp;You're all settled up with <strong>{other_name}</strong> for <strong>{group_name}</strong>.
        </p>
      </div>
      {_cta_button("View Group", action_url)}
    """
    return subject, plain, _wrap_html(body)


def settlement_recorded(
    name: str,
    payer: str,
    recipient: str,
    amount: str,
    group_name: str,
    is_payer: bool = False,
    action_url: str = '/',
) -> tuple[str, str, str]:
    subject = f"Settlement recorded — {amount}"
    if is_payer:
        headline = f"Your {amount} payment to {recipient} has been recorded."
    else:
        headline = f"{payer} paid you {amount}."

    plain = (
        f"Hi {name},\n\n"
        f"{headline}\n\n"
        f"Payer: {payer}\n"
        f"Recipient: {recipient}\n"
        f"Amount: {amount}\n"
        f"Group: {group_name}\n"
        f"Status: Recorded\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Settlement recorded</h2>
      <p style="color:{_MUTED};">Hi <strong style="color:{_TEXT};">{name}</strong>,</p>
      <div style="background:{_BG_DARK};border:1px solid {_GREEN}40;border-radius:10px;
                  padding:16px 20px;margin:16px 0;">
        <p style="margin:0;color:{_TEXT};font-weight:600;font-size:15px;">{headline}</p>
      </div>
      {_info_table([
          ('Payer', payer),
          ('Recipient', recipient),
          ('Amount', amount),
          ('Group', group_name),
          ('Status', 'Recorded'),
      ])}
      {_cta_button("View Group", action_url)}
    """
    return subject, plain, _wrap_html(body)


def payment_received(name: str, payer: str, amount: str, group_name: str, action_url: str = '/') -> tuple[str, str, str]:
    subject = f"{payer} paid you {amount}"
    plain = (
        f"Hi {name},\n\n"
        f"{payer} paid you {amount} in {group_name}.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Payment received</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>,
        <strong style="color:{_INDIGO_LIGHT};">{payer}</strong> paid you
        <strong style="color:{_GREEN};">{amount}</strong> in {group_name}.
      </p>
      {_cta_button("View Group", action_url)}
    """
    return subject, plain, _wrap_html(body)


def payment_recorded(name: str, recipient: str, amount: str, group_name: str, action_url: str = '/') -> tuple[str, str, str]:
    subject = f"Your {amount} payment to {recipient} has been recorded"
    plain = (
        f"Hi {name},\n\n"
        f"Your {amount} payment to {recipient} in {group_name} has been recorded.\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Payment recorded</h2>
      <p style="color:{_MUTED};">
        Hi <strong style="color:{_TEXT};">{name}</strong>, your
        <strong style="color:{_GREEN};">{amount}</strong> payment to
        <strong style="color:{_INDIGO_LIGHT};">{recipient}</strong> in {group_name}
        was recorded.
      </p>
      {_cta_button("View Group", action_url)}
    """
    return subject, plain, _wrap_html(body)


def settlement_reminder(
    name: str,
    creditor: str,
    amount: str,
    group_name: str,
    action_url: str = '/',
) -> tuple[str, str, str]:
    subject = f"Reminder: Pending balance with {creditor} in {group_name}"
    plain = (
        f"Hi {name},\n\n"
        f"{creditor} has a pending balance of {amount} with you in {group_name}.\n\n"
        f"View Balance: {_FRONTEND_URL}\n\n"
        f"— The SplitMate Team"
    )
    body = f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:{_TEXT};">Settlement Reminder</h2>
      <p style="color:{_MUTED};">Hi <strong style="color:{_TEXT};">{name}</strong>,</p>
      <div style="background:{_BG_DARK};border:1px solid {_BORDER};border-radius:12px;
                  padding:18px 20px;margin:20px 0;">
        <p style="margin:0;color:{_TEXT};font-size:15px;line-height:1.6;">
          <strong>{creditor}</strong> has a pending balance of
          <strong style="color:{_ORANGE};">{amount}</strong> with you in
          <strong>{group_name}</strong>.
        </p>
      </div>
      <p style="color:{_MUTED};font-size:14px;">
        When you're ready, you can record a settlement in SplitMate to keep your group balances up to date.
      </p>
      {_cta_button("View Balance", action_url)}
    """
    return subject, plain, _wrap_html(body)
