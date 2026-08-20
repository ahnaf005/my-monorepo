import type { User } from "@myapp/shared";

interface ProfileProps {
    user: User;
}

export function Profile({ user }: ProfileProps) {
    return (
        <div className="panel">
            <h2>Profile</h2>
            {/* Plain JSX interpolation — React escapes this automatically,
                so a note or name containing "<script>" renders as inert
                text, never as markup. See SECURITY.md for what turns this
                into a stored-XSS hole. */}
            <p>Name: {user.name}</p>
            <p>Email: {user.email}</p>
        </div>
    );
}
