# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-tests\full_test.spec.js >> Healthcare Portal — Full Demo >> Complete feature walkthrough — single session
- Location: e2e-tests\full_test.spec.js:76:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/appointment request submitted/i).first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByText(/appointment request submitted/i).first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - heading "Smart Healthcare" [level=6] [ref=e6]
      - generic [ref=e7]:
        - button "notifications" [ref=e8] [cursor=pointer]:
          - img [ref=e10]
        - generic [ref=e12]: P
        - paragraph [ref=e13]: patient1
        - button "Logout" [ref=e14] [cursor=pointer]:
          - img [ref=e16]
          - text: Logout
  - list [ref=e22]:
    - listitem [ref=e23]:
      - button "Dashboard" [ref=e24] [cursor=pointer]:
        - img [ref=e26]
        - generic [ref=e29]: Dashboard
    - listitem [ref=e30]:
      - button "Browse Doctors" [ref=e31] [cursor=pointer]:
        - img [ref=e33]
        - generic [ref=e36]: Browse Doctors
    - listitem [ref=e37]:
      - button "My Appointments" [ref=e38] [cursor=pointer]:
        - img [ref=e40]
        - generic [ref=e43]: My Appointments
    - listitem [ref=e44]:
      - button "AI Assistant" [ref=e45] [cursor=pointer]:
        - img [ref=e47]
        - generic [ref=e50]: AI Assistant
    - listitem [ref=e51]:
      - button "Profile" [ref=e52] [cursor=pointer]:
        - img [ref=e54]
        - generic [ref=e57]: Profile
  - main [ref=e58]:
    - generic [ref=e60]:
      - button "Back to Doctors" [ref=e61] [cursor=pointer]:
        - img [ref=e63]
        - text: Back to Doctors
      - heading "Book Appointment" [level=4] [ref=e65]
      - generic [ref=e66]:
        - generic [ref=e69]:
          - heading "Dr. dr_sunita" [level=6] [ref=e70]
          - generic [ref=e71]:
            - img [ref=e72]
            - generic [ref=e74]: Cardiology
          - paragraph [ref=e75]: "Experience: 20 years"
          - generic [ref=e76]:
            - img [ref=e77]
            - paragraph [ref=e79]: ₹700 per consultation
        - generic [ref=e82]:
          - heading "Appointment Details" [level=6] [ref=e83]
          - separator [ref=e84]
          - generic [ref=e85]:
            - generic [ref=e86]:
              - img [ref=e87]
              - heading "Available Time Slots" [level=6] [ref=e90]
            - generic [ref=e91]:
              - generic [ref=e92]: Thu, 16 Apr
              - generic [ref=e93]:
                - button "9:00 am" [ref=e94] [cursor=pointer]:
                  - generic [ref=e95]: 9:00 am
                - button "11:00 am" [ref=e96] [cursor=pointer]:
                  - generic [ref=e97]: 11:00 am
                - button "1:00 pm" [ref=e98] [cursor=pointer]:
                  - generic [ref=e99]: 1:00 pm
                - button "3:00 pm" [ref=e100] [cursor=pointer]:
                  - generic [ref=e101]: 3:00 pm
                - button "5:00 pm" [ref=e102] [cursor=pointer]:
                  - generic [ref=e103]: 5:00 pm
            - generic [ref=e104]:
              - generic [ref=e105]: Fri, 17 Apr
              - generic [ref=e106]:
                - button "9:00 am" [ref=e107] [cursor=pointer]:
                  - generic [ref=e108]: 9:00 am
                - button "11:00 am" [ref=e109] [cursor=pointer]:
                  - generic [ref=e110]: 11:00 am
                - button "1:00 pm" [ref=e111] [cursor=pointer]:
                  - generic [ref=e112]: 1:00 pm
                - button "3:00 pm" [ref=e113] [cursor=pointer]:
                  - generic [ref=e114]: 3:00 pm
                - button "5:00 pm" [ref=e115] [cursor=pointer]:
                  - generic [ref=e116]: 5:00 pm
            - generic [ref=e117]:
              - generic [ref=e118]: Sat, 18 Apr
              - generic [ref=e119]:
                - button "9:00 am" [ref=e120] [cursor=pointer]:
                  - generic [ref=e121]: 9:00 am
                - button "11:00 am" [ref=e122] [cursor=pointer]:
                  - generic [ref=e123]: 11:00 am
                - button "1:00 pm" [ref=e124] [cursor=pointer]:
                  - generic [ref=e125]: 1:00 pm
                - button "3:00 pm" [ref=e126] [cursor=pointer]:
                  - generic [ref=e127]: 3:00 pm
                - button "5:00 pm" [ref=e128] [cursor=pointer]:
                  - generic [ref=e129]: 5:00 pm
            - generic [ref=e130]:
              - generic [ref=e131]: Sun, 19 Apr
              - generic [ref=e132]:
                - button "9:00 am" [ref=e133] [cursor=pointer]:
                  - generic [ref=e134]: 9:00 am
                - button "11:00 am" [ref=e135] [cursor=pointer]:
                  - generic [ref=e136]: 11:00 am
                - button "1:00 pm" [ref=e137] [cursor=pointer]:
                  - generic [ref=e138]: 1:00 pm
                - button "3:00 pm" [ref=e139] [cursor=pointer]:
                  - generic [ref=e140]: 3:00 pm
                - button "5:00 pm" [ref=e141] [cursor=pointer]:
                  - generic [ref=e142]: 5:00 pm
            - generic [ref=e143]:
              - generic [ref=e144]: Mon, 20 Apr
              - generic [ref=e145]:
                - button "9:00 am" [ref=e146] [cursor=pointer]:
                  - generic [ref=e147]: 9:00 am
                - button "11:00 am" [ref=e148] [cursor=pointer]:
                  - generic [ref=e149]: 11:00 am
                - button "1:00 pm" [ref=e150] [cursor=pointer]:
                  - generic [ref=e151]: 1:00 pm
                - button "3:00 pm" [ref=e152] [cursor=pointer]:
                  - generic [ref=e153]: 3:00 pm
                - button "5:00 pm" [ref=e154] [cursor=pointer]:
                  - generic [ref=e155]: 5:00 pm
            - generic [ref=e156]:
              - generic [ref=e157]: Tue, 21 Apr
              - generic [ref=e158]:
                - button "9:00 am" [ref=e159] [cursor=pointer]:
                  - generic [ref=e160]: 9:00 am
                - button "11:00 am" [ref=e161] [cursor=pointer]:
                  - generic [ref=e162]: 11:00 am
                - button "1:00 pm" [ref=e163] [cursor=pointer]:
                  - generic [ref=e164]: 1:00 pm
                - button "3:00 pm" [ref=e165] [cursor=pointer]:
                  - generic [ref=e166]: 3:00 pm
                - button "5:00 pm" [ref=e167] [cursor=pointer]:
                  - generic [ref=e168]: 5:00 pm
            - generic [ref=e169]:
              - generic [ref=e170]: Wed, 22 Apr
              - generic [ref=e171]:
                - button "9:00 am" [ref=e172] [cursor=pointer]:
                  - generic [ref=e173]: 9:00 am
                - button "11:00 am" [ref=e174] [cursor=pointer]:
                  - generic [ref=e175]: 11:00 am
                - button "1:00 pm" [ref=e176] [cursor=pointer]:
                  - generic [ref=e177]: 1:00 pm
                - button "3:00 pm" [ref=e178] [cursor=pointer]:
                  - generic [ref=e179]: 3:00 pm
                - button "5:00 pm" [ref=e180] [cursor=pointer]:
                  - generic [ref=e181]: 5:00 pm
            - separator [ref=e182]
          - alert [ref=e183]:
            - img [ref=e185]
            - generic [ref=e187]: Failed to book appointment. Please try again.
            - button "Close" [ref=e189] [cursor=pointer]:
              - img [ref=e190]
          - generic [ref=e193]:
            - generic [ref=e195]:
              - generic [ref=e196]:
                - text: Appointment Date
                - generic [ref=e197]: "*"
              - generic [ref=e198]:
                - textbox "Appointment Date" [ref=e199]: 2026-04-16
                - group:
                  - generic: Appointment Date *
            - generic [ref=e201]:
              - generic [ref=e202]:
                - text: Appointment Time
                - generic [ref=e203]: "*"
              - generic [ref=e204]:
                - textbox "Appointment Time" [active] [ref=e205]: 10:30
                - group:
                  - generic: Appointment Time *
            - generic [ref=e207]:
              - generic [ref=e208]:
                - text: Symptoms / Reason for visit
                - generic [ref=e209]: "*"
              - generic [ref=e210]:
                - textbox "Symptoms / Reason for visit" [ref=e211]:
                  - /placeholder: Describe your symptoms or reason for the appointment…
                  - text: "Follow-up: persistent back pain"
                - group:
                  - generic: Symptoms / Reason for visit *
            - generic [ref=e213]:
              - generic [ref=e214]: Consultation Fee
              - generic [ref=e215]:
                - textbox "Consultation Fee" [ref=e216]: ₹700
                - group:
                  - generic: Consultation Fee
            - button "Book Appointment" [ref=e218] [cursor=pointer]: Book Appointment
```

# Test source

```ts
  415 |     await pause(page);
  416 |     await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  417 |     await expect(page.getByRole('button', { name: /cancel/i }).first()).toBeVisible();
  418 | 
  419 |     // Fill in some health information
  420 |     const ageField = page.getByLabel(/age/i);
  421 |     if ((await ageField.count()) > 0) {
  422 |       await ageField.clear();
  423 |       await ageField.fill('25');
  424 |       await pause(page, SHORT);
  425 |     }
  426 | 
  427 |     // Select gender if available
  428 |     const genderSelect = page.getByLabel(/gender/i);
  429 |     if ((await genderSelect.count()) > 0) {
  430 |       await genderSelect.click();
  431 |       await pause(page, SHORT);
  432 |       const maleOpt = page.getByRole('option', { name: /male/i });
  433 |       if ((await maleOpt.count()) > 0) {
  434 |         await maleOpt.click();
  435 |         await pause(page, SHORT);
  436 |       } else {
  437 |         await page.keyboard.press('Escape');
  438 |       }
  439 |     }
  440 | 
  441 |     // Select blood group if available
  442 |     const bgSelect = page.getByLabel(/blood group/i);
  443 |     if ((await bgSelect.count()) > 0) {
  444 |       await bgSelect.click();
  445 |       await pause(page, SHORT);
  446 |       const bPos = page.getByRole('option', { name: 'B+' });
  447 |       if ((await bPos.count()) > 0) {
  448 |         await bPos.click();
  449 |         await pause(page, SHORT);
  450 |       } else {
  451 |         await page.keyboard.press('Escape');
  452 |       }
  453 |     }
  454 | 
  455 |     await pause(page);
  456 | 
  457 |     // Cancel editing (don't save — just demo the toggle)
  458 |     await page.getByRole('button', { name: /cancel/i }).first().click();
  459 |     await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible();
  460 |     await pause(page);
  461 | 
  462 |     // -- Change Password dialog --
  463 |     await page.getByRole('button', { name: /change password/i }).click();
  464 |     await expect(page.locator('.MuiDialog-root')).toBeVisible();
  465 |     await pause(page);
  466 |     // Close dialog
  467 |     const dialogCloseBtn = page.locator('.MuiDialog-root').getByRole('button', { name: /cancel|close/i }).first();
  468 |     if ((await dialogCloseBtn.count()) > 0) {
  469 |       await dialogCloseBtn.click();
  470 |     } else {
  471 |       await page.keyboard.press('Escape');
  472 |     }
  473 |     await pause(page);
  474 | 
  475 |     // ═══════════════════════════════════════════════════════════════════════════
  476 |     // PART 9: LOGOUT CONFIRMATION — Show Stay / Log Out
  477 |     // ═══════════════════════════════════════════════════════════════════════════
  478 | 
  479 |     await page.getByRole('button', { name: /logout/i }).click();
  480 |     await expect(page.getByText('Log out?')).toBeVisible();
  481 |     await expect(page.getByText(/are you sure/i)).toBeVisible();
  482 |     await pause(page);
  483 |     // Click Stay
  484 |     await page.getByRole('button', { name: /stay/i }).click();
  485 |     await expect(page).toHaveURL(/\/dashboard/);
  486 |     await pause(page);
  487 | 
  488 |     // ═══════════════════════════════════════════════════════════════════════════
  489 |     // PART 10: BOOK A SECOND APPOINTMENT with a different doctor (for cancel demo)
  490 |     // ═══════════════════════════════════════════════════════════════════════════
  491 | 
  492 |     await sidebar.getByText('Browse Doctors').click();
  493 |     await page.waitForURL('**/doctors**');
  494 |     await page.waitForSelector('.MuiCard-root', { timeout: 10000 });
  495 |     // Search for dr_amit (different from dr_priya to avoid slot conflicts)
  496 |     await page.getByPlaceholder(/search by name/i).clear();
  497 |     await page.getByPlaceholder(/search by name/i).fill('Amit');
  498 |     await page.waitForTimeout(800);
  499 |     await pause(page);
  500 |     await page.getByRole('button', { name: /book appointment/i }).first().click();
  501 |     await page.waitForURL('**/book-appointment/**');
  502 |     await pause(page);
  503 | 
  504 |     // Click an available slot chip — backend requires slot to be in doctor's availableSlots
  505 |     const slotChip2 = page.locator('.MuiChip-outlined.MuiChip-colorPrimary').first();
  506 |     if ((await slotChip2.count()) > 0) {
  507 |       await slotChip2.click();
  508 |       await pause(page);
  509 |     }
  510 |     await page.getByLabel(/symptoms/i).fill('Follow-up: persistent back pain');
  511 |     await pause(page);
  512 |     await page.locator('button[type="submit"]').click();
  513 |     await expect(
  514 |       page.getByText(/appointment request submitted/i).first()
> 515 |     ).toBeVisible({ timeout: 20000 });
      |       ^ Error: expect(locator).toBeVisible() failed
  516 |     await pause(page);
  517 | 
  518 |     // ═══════════════════════════════════════════════════════════════════════════
  519 |     // PART 11: PATIENT CANCELS ONE APPOINTMENT
  520 |     // ═══════════════════════════════════════════════════════════════════════════
  521 | 
  522 |     await page.waitForURL('**/appointments**', { timeout: 10000 }).catch(() => {});
  523 |     await sidebar.getByText('My Appointments').click();
  524 |     await page.waitForURL('**/appointments**');
  525 |     await pause(page);
  526 | 
  527 |     // Cancel the first Pending appointment
  528 |     const cancelBtns = page.getByRole('button', { name: /^cancel$/i });
  529 |     const cancelCount = await cancelBtns.count();
  530 |     if (cancelCount > 0) {
  531 |       await cancelBtns.first().click();
  532 |       await pause(page, SHORT);
  533 |       // Confirm dialog
  534 |       const yesCancel = page.getByRole('button', { name: /yes, cancel/i });
  535 |       if ((await yesCancel.count()) > 0) {
  536 |         await yesCancel.click();
  537 |         await pause(page);
  538 |         await page.waitForTimeout(1500);
  539 |       }
  540 |     }
  541 |     await pause(page);
  542 | 
  543 |     // Show cancelled tab now has an entry
  544 |     await page.getByRole('tab', { name: /cancelled/i }).click();
  545 |     await pause(page);
  546 |     await page.getByRole('tab', { name: /upcoming/i }).click();
  547 |     await pause(page);
  548 | 
  549 |     // Now logout patient
  550 |     await logout(page);
  551 | 
  552 |     // ═══════════════════════════════════════════════════════════════════════════
  553 |     // PART 12: LOGIN AS DR_PRIYA — See pending = 1 on dashboard
  554 |     // ═══════════════════════════════════════════════════════════════════════════
  555 | 
  556 |     await login(page, DR_PRIYA.username, DR_PRIYA.password);
  557 | 
  558 |     // -- Doctor dashboard --
  559 |     await expect(page.getByText(/welcome, dr\./i)).toBeVisible();
  560 |     await expect(page.getByText("Today's Appointments")).toBeVisible();
  561 |     await expect(page.getByText('Pending Confirmation')).toBeVisible();
  562 |     await expect(page.getByText('Confirmed Today')).toBeVisible();
  563 |     await pause(page);
  564 | 
  565 |     // -- Doctor sidebar --
  566 |     const docSidebar = page.locator('.MuiDrawer-root');
  567 |     await expect(docSidebar.getByText('Dashboard')).toBeVisible();
  568 |     await expect(docSidebar.getByText('Appointments', { exact: true })).toBeVisible();
  569 |     await expect(docSidebar.getByText('Availability')).toBeVisible();
  570 |     await expect(docSidebar.getByText('Profile')).toBeVisible();
  571 |     await pause(page);
  572 | 
  573 |     // -- Quick Actions --
  574 |     await expect(page.getByText('Quick Actions')).toBeVisible();
  575 |     await expect(page.getByRole('button', { name: /view all appointments/i })).toBeVisible();
  576 |     await expect(page.getByRole('button', { name: /manage availability/i })).toBeVisible();
  577 |     await pause(page);
  578 | 
  579 |     // ═══════════════════════════════════════════════════════════════════════════
  580 |     // PART 13: CLICK PENDING CARD → Appointments filtered to PENDING, Accept
  581 |     // ═══════════════════════════════════════════════════════════════════════════
  582 | 
  583 |     // Click the "Pending Confirmation" card (now clickable) — deep-links to pending filter
  584 |     await page.getByText('Pending Confirmation').click();
  585 |     await page.waitForURL('**/doctor-appointments**');
  586 |     await pause(page);
  587 | 
  588 |     // -- Summary bar --
  589 |     await expect(page.getByText("Today's Appointments")).toBeVisible();
  590 |     await expect(page.getByText('Pending Requests')).toBeVisible();
  591 |     await expect(page.getByText('Next Appointment')).toBeVisible();
  592 |     await pause(page);
  593 | 
  594 |     // -- Filter buttons demo --
  595 |     await page.getByRole('button', { name: /confirmed/i }).click();
  596 |     await pause(page);
  597 |     await page.getByRole('button', { name: /completed/i }).click();
  598 |     await pause(page);
  599 |     await page.getByRole('button', { name: /^all/i }).first().click();
  600 |     await pause(page);
  601 |     await page.getByRole('button', { name: /pending/i }).click();
  602 |     await pause(page);
  603 | 
  604 |     // -- Accept the pending appointment from patient1 --
  605 |     const acceptBtn = page.getByRole('button', { name: /accept/i }).first();
  606 |     if ((await acceptBtn.count()) > 0) {
  607 |       await acceptBtn.click();
  608 |       await pause(page);
  609 |       await page.waitForTimeout(1500);
  610 |       await pause(page);
  611 |     }
  612 | 
  613 |     // -- Refresh to show updated status — pending should now be 0 --
  614 |     await page.getByRole('button', { name: /refresh/i }).click();
  615 |     await pause(page);
```