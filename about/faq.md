---
title: FAQ
layout: default
---

## {{ page.title }}

{: .page-header .no_toc}

_These FAQs primarily target developers working on the projects being stewarded by CORSA. Don't see your question listed below? Please contact [CORSA](mailto:info@corsa.center)._

-   Table of Contents
    {:toc}

### How do I set up a GitHub account?

If you’re new to GitHub and open source in general, figuring out how to get set up can be a challenge. You may want to read through the GitHub Help pages on [setting up and managing your GitHub profile](https://help.github.com/categories/setting-up-and-managing-your-github-profile/).

1. [Create an account on GitHub](https://github.com/join).

    You _do not need_ a separate work account and personal account. Instead, you can [link multiple email addresses to the same GitHub account](https://help.github.com/articles/adding-an-email-address-to-your-github-account/), which is almost always preferred.

2. [Update your profile information](https://github.com/settings/profile).

    - **Photo**: A headshot photo, or image that is uniquely you.
    - **Name**: Your first and last name.
    - **Bio**: Include a few words about yourself! Don't forget to mention CORSA!
    - **URL**: This might be your work  page, or a personal website if you prefer.
    - **Company**: Whatever company you work for.
    - **Location**: Your primary location.

3. Add your email address (and any aliases) to your [Email Settings](https://github.com/settings/emails) page. This will link any commits done via [your Git identity](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup#Your-Identity) to your GitHub account.

4. [Enable two-factor authentication (2FA)](https://github.com/settings/security).

### What is/isn’t allowed to be included in my repo?

Remember that these repositories _are hosted_ on GitHub servers, _NOT your organization's servers_, and content placed in them should be limited to "email like" communications. That means:

-   NO Classified
-   NO Export Controlled
-   NO Official Use Only (OUO)
-   NO Health Insurance Portability and Accountability Act (HIPAA)
-   NO Personally Identifiable Information (PII)
-   NO NDA or vendor-proprietary information
-   NO Unclassified Controlled Information (UCI)
-   NO Unclassified Controlled Nuclear Information (UCNI)

When in doubt, contact your division representative further guidance.

### How do I include my repo in this website’s catalog?

First check if your repository is included on this website’s home page and [full catalog]({{ '/' | relative_url }}). If not, open an issue requesting to have your repo added to the catalog.

### How do I let people know about my new repo?

Now that your project is on GitHub, make sure users and contributors can find it! There are several ways to do this. 

1. Include meaningful metadata (description and topic tags) in your repository. Example: [Spack](https://github.com/spack/spack) lists several topic tags below a one-sentence description.

    - Start with our [list]({{site.repo_url}}/{{site.repo_blob_path}}/{{site.repo_branch}}/catalog/README.md) of recommended, standardized topics.

    - See helpful hints on [GitHub's topic help page](https://help.github.com/articles/about-topics/). Add tags relevant to your project's programming language, platforms, and more (e.g., Python, HPC, Linux).

2. Let [Twitter](https://twitter.com/{{site.twitter.username}}) followers know your project is available on GitHub. Feel free to tag this handle on your own tweet.

3. Publicize any outreach activities or major milestones related to your project. Examples: You have a paper/poster/presentation accepted at a conference; you're hosting a workshop or webinar; your project is nominated for an award; or you're speaking on a podcast or guest blogging.

### How do I contribute news or other content to this website?

Open an issue and/or pull request and we will review it.

### What should I do if my repo is no longer actively developed/maintained?

1. Remove your repo’s topic tags (e.g., `math-physics`), which connect it to this website’s browsable categories. 

2. Submit a pull request [updating the `input_lists.json` file]({{site.repo_url}}/{{site.repo_blob_path}}/{{site.repo_branch}}/_explore/input_lists.json) to remove your repo’s name if necessary. 

3. Change your repo's status via Settings > Manage Access > Who has access > Manage > Danger Zone > Archive this repository (`settings#danger-zone`). 
