const TYPEFORM_API_BASE = "https://api.typeform.com";

export async function getTypeformForms(accessToken: string): Promise<any[]> {
  const response = await fetch(`${TYPEFORM_API_BASE}/forms`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Typeform] Error fetching forms:", error);
    throw new Error(`Failed to fetch forms: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function getTypeformForm(accessToken: string, formId: string): Promise<any> {
  const response = await fetch(`${TYPEFORM_API_BASE}/forms/${formId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch form: ${response.statusText}`);
  }

  return response.json();
}

export async function createTypeformForm(accessToken: string, title: string): Promise<any> {
  const response = await fetch(`${TYPEFORM_API_BASE}/forms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      fields: [
        {
          type: "short_text",
          title: "Your Name",
          properties: {
            description: "Please enter your name",
          },
        },
        {
          type: "email",
          title: "Email Address",
          properties: {
            description: "We'll use this to get back to you",
          },
        },
        {
          type: "long_text",
          title: "Your Message",
          properties: {
            description: "What would you like to tell us?",
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Typeform] Error creating form:", error);
    throw new Error(`Failed to create form: ${response.statusText}`);
  }

  return response.json();
}

export async function updateTypeformForm(
  accessToken: string,
  formId: string,
  updates: { title?: string; fields?: any[] }
): Promise<any> {
  const currentForm = await getTypeformForm(accessToken, formId);
  
  const response = await fetch(`${TYPEFORM_API_BASE}/forms/${formId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...currentForm,
      ...updates,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Typeform] Error updating form:", error);
    throw new Error(`Failed to update form: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteTypeformForm(accessToken: string, formId: string): Promise<void> {
  const response = await fetch(`${TYPEFORM_API_BASE}/forms/${formId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Typeform] Error deleting form:", error);
    throw new Error(`Failed to delete form: ${response.statusText}`);
  }
}

export async function getTypeformResponses(
  accessToken: string,
  formId: string,
  options?: { pageSize?: number; since?: string }
): Promise<any[]> {
  const params = new URLSearchParams();
  if (options?.pageSize) params.set("page_size", options.pageSize.toString());
  if (options?.since) params.set("since", options.since);

  const url = `${TYPEFORM_API_BASE}/forms/${formId}/responses${params.toString() ? `?${params.toString()}` : ""}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Typeform] Error fetching responses:", error);
    throw new Error(`Failed to fetch responses: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

export function isTypeformConfigured(): boolean {
  return !!process.env.TYPEFORM_ACCESS_TOKEN;
}
