const objectToFormData = (object: Record<string, unknown>) =>
  Object.keys(object).reduce((formData: FormData, key: string): FormData => {
    formData.append(key, JSON.stringify(object[key]));
    return formData;
  }, new FormData());

export default objectToFormData;
