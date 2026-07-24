# Portal Company Contact Identity Review

## Working Model

- A **user** is the authenticated website login.
- A **portal account** is the user-facing profile row for that login.
- A **customer contact** is the CRM contact row. It can be a person or a company.
- A **company customer account** is the `customers` row that carries the Innovations account number and drives prices, statements, orders, and account data.
- **Company portal access** means a person login is linked to a person contact, and that person contact is authorized to see a linked company customer account.

The intended admin model is:

```text
auth user/login
  -> profiles.crm_contact_id      person contact, e.g. Nadia Reifer
  -> profiles.crm_customer_id     company customer account, e.g. Enhance Vision Optical / EVO

contacts.parent_id or contacts.linked_customer_id
  -> connects the person contact to the company customer account

contact tags on the person, parent company, or company contact
  -> determine sensitive company feature access, such as statements
```

## Review Findings

1. The backend identity resolver already supports this model.
   `sync_customer_portal_identity` resolves `profiles.crm_customer_id` from the explicit profile customer, the person contact's `linked_customer_id`, the person contact's Innovations parent customer, or the parent company contact.

2. Statement access is contact-authorized, not just company-authorized.
   `can_access_customer_statement` allows statements when the approved profile's person contact, parent company, or company customer contact has an Owner, CEO, or Buyer tag.

3. The confusing admin state came from the Website Portals page.
   It treated an ERP company row with no direct `portalUser` as "no website login", even when a person contact linked to that company had a login.

4. Admin screens should not imply the company itself needs a login when linked person logins exist.
   The right surface is: show the linked person login(s), their portal approval, their contact link, and their feature/statement permissions.

## Implementation Direction

- Keep one company customer account per Innovations account number.
- Keep one portal login per real person.
- Let multiple person contacts have portal access to the same company account.
- Review portal permissions at the person-login level, with company data resolved through `profiles.crm_customer_id`.
- Avoid creating a duplicate company login when the company already has linked person logins.
