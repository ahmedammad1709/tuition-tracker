Build a professional, solid, mobile-friendly web app called "Tuition Fee Tracker" for a private tutor who teaches about 8-10 students of different grades. It replaces his memory and notebook: he needs to track which student paid how much fee each month. It is for ONE user only (the tutor), so everything must be behind a login.

## PURPOSE
Students pay at different dates (some on the 1st, some on the 15th) and different amounts (e.g. 1000, 2000, 3000 PKR). The tutor forgets who has paid. The app must make it instantly clear who has paid, who has partially paid, and who is still pending, for any month. Currency is PKR (Rs). The UI is English, simple and clear.

## AUTH & PRIVACY
- Email + password login only. No public signup page: only one owner account. Everything (all pages, all data) is private, protected with row-level security so only the logged-in owner can read or write.
- Logout button. Keep session logged in on the device.

## DATA MODEL
- students: id, name, grade, parent_name (optional), phone (optional), monthly_fee, join_date, status ("active" or "left"), leave_date (nullable), notes.
- monthly_records: one row per student per month: student_id, month (YYYY-MM), fee_due (a SNAPSHOT of the fee for that month, so changing a student's fee later does NOT alter past months).
- payments: id, student_id, month (YYYY-MM the payment is for), amount, paid_on (date), note. Multiple payments per month are allowed (partial payments).
- A student only owes fees from their join month until their leave month. Never generate dues for months before joining or after leaving.
- Never hard-delete students. Marking "left" keeps their full history.

## PAGES & FEATURES

1. Dashboard
- Month selector (prev/next arrows, default = current month).
- Summary cards: Total Expected, Collected, Remaining (with a progress bar), Active Students count.
- "Pending this month" list: students with unpaid/partial status, showing remaining amount, with a quick "Mark paid / Add payment" button.
- Small bar chart of collection for the last 6 months.

2. Students
- List of active students (search + filter by grade) and a separate tab for "Left" students.
- Add student form (name, grade, monthly fee, join date, phone, parent name, notes).
- Edit student (fee change applies from the next/current month onward only).
- "Mark as Left" action with leave date. A left student moves to the Left tab; they can also be re-activated.
- Student profile page: join date, current fee, status, a table of every month (fee due, amount paid, balance, status, payment dates), total paid all-time, total outstanding balance. Include previous months that are unpaid ("arrears").

3. Monthly Fees (the main working screen)
- Choose a month. Show every active student for that month as a row/card: name, grade, fee due, paid so far, balance, status badge.
- Status badges: Paid (green), Partial (amber), Unpaid (soft red).
- Tap "Add payment" to open a small dialog: amount (prefilled with remaining balance), date (default today), optional note. Support partial payments. A "Paid in full" one-tap shortcut.
- Ability to edit/delete a payment entry in case of a mistake (with confirmation).
- Ability to record a late payment for a previous month.
- Optional: WhatsApp reminder button per unpaid student that opens a wa.me link with a prefilled polite message ("Assalam o Alaikum, this is a reminder that [Student]'s fee of Rs [balance] for [Month] is pending.").

4. Reports
- Month-wise collection table and chart.
- Total outstanding (all arrears) grouped by student.
- Grade-wise student count and fee totals.
- Export to CSV, and a full "Backup data" (JSON/CSV download) button in Settings.

5. Settings
- Change password, logout, backup/export data.

## DESIGN SYSTEM (very important)
Premium, calm, trustworthy, "emerald and champagne" theme.
- Primary: Emerald Ink #064E3B (header/sidebar, primary buttons, main cards)
- Background / light surface: Champagne #F8E7C9 and a lighter tint #FDF8EC for page background and cards
- Related shades: deep emerald #022C22 (dark text/dark sections), mid emerald #065F46 and #047857 (hover/active states), soft emerald tint #D1FAE5 (subtle highlights), deeper champagne #EBD3A6 (borders/dividers), warm gold accent #C9A46A (small highlights/icons only)
- Status colors: Paid = emerald #10B981, Partial = amber #D99A2B, Unpaid = soft red #B91C1C (used sparingly, with tinted badge backgrounds)
- Text: dark emerald #022C22 on champagne; champagne #F8E7C9 on emerald backgrounds.
- Font: Poppins (Google Fonts), clean hierarchy with good weight contrast.
- Rounded cards (large radius ~20px), soft shadows, generous spacing, consistent icons (lucide).
- Define all colors as design tokens (CSS variables / Tailwind theme), not hardcoded.

## UX & ANIMATION
Professional and solid, with subtle, pleasant animations (not flashy):
- Smooth page/route transitions (fade + slight slide).
- Cards fade/slide in with a light stagger on load.
- Numbers on the dashboard count up; progress bars animate to their value.
- Gentle hover lift on cards and buttons; button press feedback.
- Dialogs/modals animate in smoothly; toast notifications for "Payment saved", etc.
- Skeleton loaders while data loads.
- A small celebratory touch (e.g. a check-mark animation) when a month's fee is marked fully paid.
- Respect "prefers-reduced-motion".

## RESPONSIVENESS
Mobile-first: the tutor will mostly use it on his phone. Use a bottom navigation bar on mobile and a sidebar on desktop. Large tap targets. Everything must work well at 375px width.

## QUALITY
- Validate all inputs (no negative amounts, fee required, dates valid).
- Clear empty states with helpful text (e.g. "No students yet, add your first student").
- Confirm before destructive actions.
- Clean, well-organized code and reusable components.

Start by setting up auth, the database tables with row-level security, and the design system. Then build the Dashboard, Students, Monthly Fees, Reports and Settings pages. Seed a few sample students in the first version so I can see how it looks, and I will delete them later.