
-- Clean up the broken user and related data
DELETE FROM public.user_roles WHERE user_id = '5222fe72-53cb-4b03-adfa-88613b4d6a0a';
DELETE FROM auth.identities WHERE user_id = '5222fe72-53cb-4b03-adfa-88613b4d6a0a';
DELETE FROM auth.sessions WHERE user_id = '5222fe72-53cb-4b03-adfa-88613b4d6a0a';
DELETE FROM auth.users WHERE id = '5222fe72-53cb-4b03-adfa-88613b4d6a0a';
